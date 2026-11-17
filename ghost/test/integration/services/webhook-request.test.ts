import assert from 'node:assert/strict';
import { promises as dnsPromises } from 'node:dns';
import nock from 'nock';
import sinon from 'sinon';
import { LimitService } from '@tryghost/limit-service';
import logging from '@tryghost/logging';

// @ts-expect-error This module lacks type definitions.
import WebhookTrigger from '../../../core/server/services/webhooks/webhook-trigger';
import configUtils from '../../utils/config-utils';

const WEBHOOK_EVENT = 'post.added';
const WEBHOOK_TARGET = 'https://test-webhook-receiver.com';
const WEBHOOK_PATH = '/webhook-delivery/';

function createModels() {
  return {
    Webhook: {
      edit: sinon.stub().resolves(null),
      destroy: sinon.stub().resolves(null),
      findAllByEvent: sinon.stub(),
    },
  };
}

function createPayload() {
  return sinon.stub().resolves({ post: { current: { id: 1, title: 'Test' }, previous: {} } });
}

function isWrapped(value: unknown): boolean {
  return typeof value === 'function' && Reflect.has(value, 'restore');
}

describe('Webhook delivery', function () {
  let models: ReturnType<typeof createModels>;
  let payload: ReturnType<typeof createPayload>;
  let limitService: sinon.SinonStubbedInstance<LimitService>;

  beforeEach(function () {
    models = createModels();
    payload = createPayload();

    const realLimitService = new LimitService();
    limitService = sinon.stub(realLimitService);
    limitService.isLimited.withArgs('customIntegrations').returns(false);

    // Stub DNS so request-external doesn't fail on fake domains
    if (!isWrapped(dnsPromises.lookup)) {
      sinon.stub(dnsPromises, 'lookup').resolves({ address: '123.123.123.123', family: 4 });
    }

    nock.disableNetConnect();
  });

  afterEach(async function () {
    nock.cleanAll();
    nock.enableNetConnect();
    await configUtils.restore();
    sinon.restore();
  });

  function setupWebhookModel(secret = '') {
    const webhookModel = {
      id: 'webhook-test-id',
      get: sinon.stub(),
    };
    webhookModel.get.withArgs('event').returns(WEBHOOK_EVENT);
    webhookModel.get.withArgs('target_url').returns(WEBHOOK_TARGET + WEBHOOK_PATH);
    webhookModel.get.withArgs('secret').returns(secret);

    models.Webhook.findAllByEvent
      .withArgs(WEBHOOK_EVENT, { context: { internal: true } })
      .resolves({ models: [webhookModel] });

    return webhookModel;
  }

  describe('using @tryghost/request (allowWebhookInternalIPs: true)', function () {
    it('delivers webhook payload via POST', async function () {
      configUtils.set('security:allowWebhookInternalIPs', true);
      setupWebhookModel();

      const scope = nock(WEBHOOK_TARGET).post(WEBHOOK_PATH).reply(200, { status: 'OK' });

      const trigger = new WebhookTrigger({ models, payload, limitService });

      await trigger.trigger(WEBHOOK_EVENT, {});

      assert.ok(
        scope.isDone(),
        'Expected webhook to be delivered as a POST request via @tryghost/request',
      );
    });
  });

  describe('using request-external (allowWebhookInternalIPs: false)', function () {
    it('delivers webhook payload via POST', async function () {
      configUtils.set('security:allowWebhookInternalIPs', false);
      configUtils.set('env', 'development'); // bypass IP validation in request-external
      setupWebhookModel();

      const scope = nock(WEBHOOK_TARGET).post(WEBHOOK_PATH).reply(200, { status: 'OK' });

      const trigger = new WebhookTrigger({ models, payload, limitService });

      await trigger.trigger(WEBHOOK_EVENT, {});

      assert.ok(
        scope.isDone(),
        'Expected webhook to be delivered as a POST request via request-external',
      );
    });
  });

  describe('delivery outcomes from real HTTP responses', function () {
    function deliveryTo(path: string) {
      return nock(WEBHOOK_TARGET).post(path);
    }

    beforeEach(function () {
      // Failed deliveries are logged; the outer afterEach restores these.
      sinon.stub(logging, 'error');
      sinon.stub(logging, 'info');
    });

    // Each transport is exercised as Ghost runs it outside tests, where failed deliveries are
    // retried, and as it runs under test, where they are not.
    const transports = [
      {
        name: '@tryghost/request (allowWebhookInternalIPs: true)',
        configure() {
          configUtils.set('security:allowWebhookInternalIPs', true);
        },
        // @tryghost/request reads the environment on each request.
        loadOutsideTests: () => require('@tryghost/request'),
        // request-external replaces the timeout with its own under test.
        keepsTimeoutUnderTests: true,
      },
      {
        name: 'request-external (allowWebhookInternalIPs: false)',
        configure() {
          configUtils.set('security:allowWebhookInternalIPs', false);
          configUtils.set('env', 'development'); // bypass IP validation in request-external
        },
        // request-external reads the environment once, when it's loaded.
        loadOutsideTests: () => loadOutsideTests('../../../core/server/lib/request-external'),
        keepsTimeoutUnderTests: false,
      },
    ];

    for (const transport of transports) {
      describe(`using ${transport.name}`, function () {
        beforeEach(function () {
          transport.configure();
          setupWebhookModel();
        });

        it('destroys the webhook when the target answers 410', async function () {
          deliveryTo(WEBHOOK_PATH).reply(410);
          const trigger = new WebhookTrigger({ models, payload, limitService });

          await trigger.trigger(WEBHOOK_EVENT, {});

          sinon.assert.calledOnceWithExactly(
            models.Webhook.destroy,
            { id: 'webhook-test-id' },
            { context: { internal: true } },
          );
          sinon.assert.notCalled(models.Webhook.edit);
        });

        it('records the status of an error response', async function () {
          deliveryTo(WEBHOOK_PATH).reply(500);
          const trigger = new WebhookTrigger({ models, payload, limitService });

          await trigger.trigger(WEBHOOK_EVENT, {});

          sinon.assert.notCalled(models.Webhook.destroy);
          sinon.assert.calledOnce(models.Webhook.edit);
          const [data] = models.Webhook.edit.args[0];
          assert.equal(data.last_triggered_status, 500);
          assert.equal(data.last_triggered_error, 'Request failed: ERR_NON_2XX_3XX_RESPONSE');
        });

        it.runIf(transport.keepsTimeoutUnderTests)(
          'gives up on a target slower than two seconds',
          async function () {
            deliveryTo(WEBHOOK_PATH).delay(2500).reply(200);
            const trigger = new WebhookTrigger({ models, payload, limitService });

            await trigger.trigger(WEBHOOK_EVENT, {});

            const [data] = models.Webhook.edit.args[0];
            assert.equal(data.last_triggered_status, undefined);
            assert.equal(data.last_triggered_error, 'Request failed: ETIMEDOUT');
          },
        );

        describe('outside the test environment', function () {
          async function triggerOutsideTests() {
            const trigger = new WebhookTrigger({
              models,
              payload,
              limitService,
              request: transport.loadOutsideTests(),
            });
            await withEnvironment('production', () => trigger.trigger(WEBHOOK_EVENT, {}));
          }

          it('retries an error response the target may recover from', async function () {
            deliveryTo(WEBHOOK_PATH).reply(503);
            const retry = deliveryTo(WEBHOOK_PATH).reply(200);

            await triggerOutsideTests();

            assert.ok(retry.isDone(), 'Expected the failed delivery to be retried');
            sinon.assert.calledOnce(models.Webhook.edit);
            assert.equal(models.Webhook.edit.args[0][0].last_triggered_status, 200);
          });

          it('retries a delivery the connection failed for', async function () {
            deliveryTo(WEBHOOK_PATH).replyWithError({
              code: 'ECONNRESET',
              message: 'socket hang up',
            });
            const retry = deliveryTo(WEBHOOK_PATH).reply(200);

            await triggerOutsideTests();

            assert.ok(retry.isDone(), 'Expected the failed delivery to be retried');
            assert.equal(models.Webhook.edit.args[0][0].last_triggered_status, 200);
          });

          it('retries a delivery that timed out', async function () {
            deliveryTo(WEBHOOK_PATH).delay(2500).reply(200);
            const retry = deliveryTo(WEBHOOK_PATH).reply(200);

            await triggerOutsideTests();

            assert.ok(retry.isDone(), 'Expected the timed out delivery to be retried');
            assert.equal(models.Webhook.edit.args[0][0].last_triggered_status, 200);
          });

          it('does not retry a response the target rejected', async function () {
            deliveryTo(WEBHOOK_PATH).reply(400);
            const retry = deliveryTo(WEBHOOK_PATH).reply(200);

            await triggerOutsideTests();

            assert.equal(retry.isDone(), false);
            assert.equal(models.Webhook.edit.args[0][0].last_triggered_status, 400);
          });

          it('destroys the webhook on a 410 without retrying', async function () {
            deliveryTo(WEBHOOK_PATH).reply(410);
            const retry = deliveryTo(WEBHOOK_PATH).reply(200);

            await triggerOutsideTests();

            assert.equal(retry.isDone(), false);
            sinon.assert.calledOnce(models.Webhook.destroy);
          });
        });
      });
    }
  });
});

async function withEnvironment<T>(environment: string, run: () => Promise<T>): Promise<T> {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = environment;
  try {
    return await run();
  } finally {
    process.env.NODE_ENV = previous;
  }
}

// Loads a fresh copy of a module as it is outside tests, leaving the shared copy in place.
function loadOutsideTests(request: string) {
  const modulePath = require.resolve(request);
  const shared = require.cache[modulePath];
  delete require.cache[modulePath];
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    return require(modulePath);
  } finally {
    process.env.NODE_ENV = previous;
    if (shared) {
      require.cache[modulePath] = shared;
    } else {
      delete require.cache[modulePath];
    }
  }
}
