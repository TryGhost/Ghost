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

    describe('using @tryghost/request (allowWebhookInternalIPs: true)', function () {
      beforeEach(function () {
        configUtils.set('security:allowWebhookInternalIPs', true);
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

      it('gives up on a target slower than two seconds', async function () {
        deliveryTo(WEBHOOK_PATH).delay(2500).reply(200);
        const trigger = new WebhookTrigger({ models, payload, limitService });

        await trigger.trigger(WEBHOOK_EVENT, {});

        const [data] = models.Webhook.edit.args[0];
        assert.equal(data.last_triggered_status, undefined);
        assert.equal(data.last_triggered_error, 'Request failed: ETIMEDOUT');
      });

      it('does not retry a POST outside the test environment, despite the retry limit', async function () {
        deliveryTo(WEBHOOK_PATH).reply(503);
        const retry = deliveryTo(WEBHOOK_PATH).reply(200);
        const trigger = new WebhookTrigger({ models, payload, limitService });
        const environment = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
          await trigger.trigger(WEBHOOK_EVENT, {});
        } finally {
          process.env.NODE_ENV = environment;
        }

        assert.equal(retry.isDone(), false);
        const [data] = models.Webhook.edit.args[0];
        assert.equal(data.last_triggered_status, 503);
      });
    });

    describe('using request-external (allowWebhookInternalIPs: false)', function () {
      beforeEach(function () {
        configUtils.set('security:allowWebhookInternalIPs', false);
        configUtils.set('env', 'development'); // bypass IP validation in request-external
        setupWebhookModel();
      });

      // Defect, pinned as it behaves today: Got keeps the status on error.response, and
      // only @tryghost/request copies it onto the error. onError reads error.statusCode,
      // so the default transport neither removes a 410 target nor records the status.
      it('records a 410 response as an unknown status instead of destroying the webhook', async function () {
        deliveryTo(WEBHOOK_PATH).reply(410);
        const trigger = new WebhookTrigger({ models, payload, limitService });

        await trigger.trigger(WEBHOOK_EVENT, {});

        sinon.assert.notCalled(models.Webhook.destroy);
        sinon.assert.calledOnce(models.Webhook.edit);
        const [data] = models.Webhook.edit.args[0];
        assert.equal(data.last_triggered_status, undefined);
        assert.equal(data.last_triggered_error, 'Request failed: ERR_NON_2XX_3XX_RESPONSE');
      });

      it('records an error response with an unknown status', async function () {
        deliveryTo(WEBHOOK_PATH).reply(500);
        const trigger = new WebhookTrigger({ models, payload, limitService });

        await trigger.trigger(WEBHOOK_EVENT, {});

        const [data] = models.Webhook.edit.args[0];
        assert.equal(data.last_triggered_status, undefined);
        assert.equal(data.last_triggered_error, 'Request failed: ERR_NON_2XX_3XX_RESPONSE');
      });
    });
  });
});
