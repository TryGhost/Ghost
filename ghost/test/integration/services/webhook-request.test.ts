import assert from 'node:assert/strict';
import { promises as dnsPromises } from 'node:dns';
import nock from 'nock';
import sinon from 'sinon';
import { LimitService } from '@tryghost/limit-service';

// @ts-expect-error This module lacks type definitions.
import WebhookTrigger from '../../../core/server/services/webhooks/webhook-trigger';
// @ts-expect-error This module lacks type definitions.
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
});
