import assert from 'node:assert/strict';
import sinon from 'sinon';

const WebhookManager = require('../../../../../core/server/services/stripe/webhook-manager');

const HANDLER_URL = 'https://site.example/members/webhooks/stripe/';
const STORED = { webhook_id: 'we_stored', secret: 'whsec_stored' };
const NOTHING = { webhook_id: null, secret: null };
const CREATED = { id: 'we_created', secret: 'whsec_created' };

describe('WebhookManager', function () {
  const transacting = {};
  let api: {
    createWebhookEndpoint: sinon.SinonStub;
    updateWebhookEndpoint: sinon.SinonStub;
    deleteWebhookEndpoint: sinon.SinonStub;
  };
  let store: {
    get: sinon.SinonStub;
    getForUpdate: sinon.SinonStub;
    save: sinon.SinonStub;
    transaction: sinon.SinonStub;
  };

  beforeEach(function () {
    api = {
      createWebhookEndpoint: sinon.stub().resolves(CREATED),
      updateWebhookEndpoint: sinon.stub().resolves(),
      deleteWebhookEndpoint: sinon.stub().resolves(),
    };
    store = {
      get: sinon.stub().resolves(STORED),
      getForUpdate: sinon.stub().resolves(STORED),
      save: sinon.stub().resolves(),
      transaction: sinon.stub().callsFake((fn) => fn(transacting)),
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  function createManager(config: { webhookSecret?: string } = {}) {
    const manager = new WebhookManager({ api, StripeWebhook: store });
    manager.configure({ webhookHandlerUrl: HANDLER_URL, ...config });
    return manager;
  }

  function assertCreatedUnderLock(manager: { webhookSecret: string | null }) {
    sinon.assert.calledOnceWithExactly(store.getForUpdate, transacting);
    sinon.assert.calledOnceWithExactly(
      api.createWebhookEndpoint,
      HANDLER_URL,
      WebhookManager.events,
    );
    sinon.assert.calledOnceWithExactly(
      store.save,
      { webhook_id: CREATED.id, secret: CREATED.secret },
      { transacting },
    );
    assert.equal(manager.webhookSecret, CREATED.secret);
  }

  describe('start', function () {
    it('keeps the stored webhook when Stripe updates it', async function () {
      const manager = createManager();

      await manager.start();

      sinon.assert.calledOnceWithExactly(
        api.updateWebhookEndpoint,
        STORED.webhook_id,
        HANDLER_URL,
        WebhookManager.events,
      );
      sinon.assert.notCalled(store.transaction);
      sinon.assert.notCalled(store.save);
      sinon.assert.notCalled(api.createWebhookEndpoint);
      assert.equal(manager.webhookSecret, STORED.secret);
    });

    it('creates and saves a webhook when nothing is stored', async function () {
      store.get.resolves(NOTHING);
      store.getForUpdate.resolves(NOTHING);
      const manager = createManager();

      await manager.start();

      sinon.assert.notCalled(api.updateWebhookEndpoint);
      sinon.assert.notCalled(api.deleteWebhookEndpoint);
      assertCreatedUnderLock(manager);
    });

    it('replaces a webhook that is missing at Stripe without deleting it', async function () {
      api.updateWebhookEndpoint.rejects({ code: 'resource_missing' });
      const manager = createManager();

      await manager.start();

      sinon.assert.notCalled(api.deleteWebhookEndpoint);
      assertCreatedUnderLock(manager);
    });

    it('deletes and replaces the webhook when the update fails for another reason', async function () {
      api.updateWebhookEndpoint.rejects(new Error('Webhook has incorrect api_version'));
      const manager = createManager();

      await manager.start();

      sinon.assert.calledOnceWithExactly(api.deleteWebhookEndpoint, STORED.webhook_id);
      sinon.assert.callOrder(
        store.getForUpdate,
        api.deleteWebhookEndpoint,
        api.createWebhookEndpoint,
      );
      assertCreatedUnderLock(manager);
    });

    it('replaces the webhook when deleting it fails', async function () {
      api.updateWebhookEndpoint.rejects(new Error('Stripe is down'));
      api.deleteWebhookEndpoint.rejects(new Error('Stripe is down'));
      const manager = createManager();

      await manager.start();

      assertCreatedUnderLock(manager);
    });

    it('uses the webhook another Ghost saved while it waited for the lock', async function () {
      api.updateWebhookEndpoint.rejects(new Error('Stripe is down'));
      store.getForUpdate.resolves({ webhook_id: 'we_theirs', secret: 'whsec_theirs' });
      const manager = createManager();

      await manager.start();

      sinon.assert.notCalled(api.deleteWebhookEndpoint);
      sinon.assert.notCalled(api.createWebhookEndpoint);
      sinon.assert.notCalled(store.save);
      assert.equal(manager.webhookSecret, 'whsec_theirs');
    });

    it('saves nothing and fails when the create fails', async function () {
      store.get.resolves(NOTHING);
      store.getForUpdate.resolves(NOTHING);
      api.createWebhookEndpoint.rejects(new Error('Stripe is down'));
      const manager = createManager();

      await assert.rejects(manager.start(), /Stripe is down/);

      sinon.assert.notCalled(store.save);
      assert.equal(manager.webhookSecret, null);
    });

    it('calls neither Stripe nor the store when the secret comes from config', async function () {
      const manager = createManager({ webhookSecret: 'whsec_config' });

      await manager.start();

      sinon.assert.notCalled(store.get);
      sinon.assert.notCalled(store.transaction);
      sinon.assert.notCalled(api.updateWebhookEndpoint);
      sinon.assert.notCalled(api.createWebhookEndpoint);
      assert.equal(manager.webhookSecret, 'whsec_config');
    });
  });
});
