import assert from 'node:assert/strict';
import sinon from 'sinon';
import { FAILURE_CODES } from '../../../../../core/server/services/stripe/webhook/failures';

const WebhookManager = require('../../../../../core/server/services/stripe/webhook-manager');

const HANDLER_URL = 'https://site.example/members/webhooks/stripe/';
const STORED = { webhook_id: 'we_stored', secret: 'whsec_stored' };
const NOTHING = { webhook_id: null, secret: null };
const CREATED = { id: 'we_created', secret: 'whsec_created' };
const EVENT = { id: 'evt_1', type: 'charge.refunded' };
const BODY = JSON.stringify(EVENT);
const signedWith = (secret: string) => `signed with ${secret}`;

describe('WebhookManager', function () {
  const transacting = {};
  let api: {
    createWebhookEndpoint: sinon.SinonStub;
    updateWebhookEndpoint: sinon.SinonStub;
    deleteWebhookEndpoint: sinon.SinonStub;
    parseWebhook: sinon.SinonStub;
  };
  let store: {
    get: sinon.SinonStub;
    getForUpdate: sinon.SinonStub;
    readSecret: sinon.SinonStub;
    save: sinon.SinonStub;
    transaction: sinon.SinonStub;
  };

  beforeEach(function () {
    api = {
      createWebhookEndpoint: sinon.stub().resolves(CREATED),
      updateWebhookEndpoint: sinon.stub().resolves(),
      deleteWebhookEndpoint: sinon.stub().resolves(),
      parseWebhook: sinon.stub().callsFake((_body, signature, secret) => {
        if (signature !== `signed with ${secret}`) {
          throw new Error('No signatures found matching the expected signature for payload.');
        }
        return EVENT;
      }),
    };
    store = {
      get: sinon.stub().resolves(STORED),
      getForUpdate: sinon.stub().resolves(STORED),
      readSecret: sinon.stub().resolves(STORED.secret),
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

    it('holds the stored secret when the calls to Stripe fail', async function () {
      api.updateWebhookEndpoint.rejects(new Error('Stripe is down'));
      api.createWebhookEndpoint.rejects(new Error('Stripe is down'));
      const manager = createManager();

      await assert.rejects(manager.start(), /Stripe is down/);

      assert.equal(await manager.parseWebhook(BODY, signedWith(STORED.secret)), EVENT);
      sinon.assert.notCalled(store.readSecret);
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

  describe('parseWebhook', function () {
    let clock: sinon.SinonFakeTimers;

    beforeEach(function () {
      clock = sinon.useFakeTimers();
    });

    async function startManager(config: { webhookSecret?: string } = {}) {
      const manager = createManager(config);
      await manager.start();
      return manager;
    }

    it('accepts an event signed with the secret in memory without reading the stored one', async function () {
      const manager = await startManager();

      assert.equal(await manager.parseWebhook(BODY, signedWith(STORED.secret)), EVENT);

      sinon.assert.notCalled(store.readSecret);
    });

    it('accepts an event signed with a new stored secret and keeps that secret', async function () {
      const manager = await startManager();
      store.readSecret.resolves('whsec_new');

      assert.equal(await manager.parseWebhook(BODY, signedWith('whsec_new')), EVENT);
      assert.equal(await manager.parseWebhook(BODY, signedWith('whsec_new')), EVENT);

      sinon.assert.calledOnce(store.readSecret);
      assert.equal(manager.webhookSecret, 'whsec_new');
    });

    it('rejects a bad signature when the stored secret is the one in memory', async function () {
      const manager = await startManager();

      await assert.rejects(manager.parseWebhook(BODY, 'bad'), /No signatures found/);

      sinon.assert.calledOnce(store.readSecret);
      assert.equal(manager.webhookSecret, STORED.secret);
    });

    it('rejects a bad signature and keeps its secret when the stored secret is another', async function () {
      const manager = await startManager();
      store.readSecret.resolves('whsec_new');

      await assert.rejects(manager.parseWebhook(BODY, 'bad'), /No signatures found/);

      assert.equal(manager.webhookSecret, STORED.secret);
    });

    it('reads the stored secret once per second however many checks fail', async function () {
      const manager = await startManager();

      for (let i = 0; i < 5; i += 1) {
        await assert.rejects(manager.parseWebhook(BODY, 'bad'), /No signatures found/);
      }
      sinon.assert.calledOnce(store.readSecret);

      await clock.tickAsync(1000);
      await assert.rejects(manager.parseWebhook(BODY, 'bad'), /No signatures found/);
      sinon.assert.calledTwice(store.readSecret);
    });

    it('shares one read between checks that fail at the same moment', async function () {
      const manager = await startManager();
      store.readSecret.resolves('whsec_new');

      const events = await Promise.all([
        manager.parseWebhook(BODY, signedWith('whsec_new')),
        manager.parseWebhook(BODY, signedWith('whsec_new')),
      ]);

      assert.deepEqual(events, [EVENT, EVENT]);
      sinon.assert.calledOnce(store.readSecret);
    });

    it('accepts an event signed with a new secret that the last read already saw', async function () {
      const manager = await startManager();
      store.readSecret.resolves('whsec_new');
      await assert.rejects(manager.parseWebhook(BODY, 'bad'), /No signatures found/);

      assert.equal(await manager.parseWebhook(BODY, signedWith('whsec_new')), EVENT);

      sinon.assert.calledOnce(store.readSecret);
      assert.equal(manager.webhookSecret, 'whsec_new');
    });

    it('rejects an event signed with a secret stored after the last read until the next read', async function () {
      const manager = await startManager();
      await assert.rejects(manager.parseWebhook(BODY, 'bad'), /No signatures found/);
      store.readSecret.resolves('whsec_new');

      await assert.rejects(
        manager.parseWebhook(BODY, signedWith('whsec_new')),
        /No signatures found/,
      );
      await clock.tickAsync(1000);

      assert.equal(await manager.parseWebhook(BODY, signedWith('whsec_new')), EVENT);
    });

    it('rejects every event when no secret is stored', async function () {
      store.get.resolves(NOTHING);
      store.getForUpdate.resolves(NOTHING);
      store.readSecret.resolves(null);
      api.createWebhookEndpoint.rejects(new Error('Stripe is down'));
      const manager = createManager();
      await assert.rejects(manager.start(), /Stripe is down/);

      await assert.rejects(manager.parseWebhook(BODY, signedWith('whsec_any')), {
        code: FAILURE_CODES.webhookSecretMissing,
        statusCode: 401,
      });
      sinon.assert.notCalled(api.parseWebhook);
    });

    it('accepts an event with the stored secret when it holds none', async function () {
      store.get.resolves(NOTHING);
      store.getForUpdate.resolves(NOTHING);
      api.createWebhookEndpoint.rejects(new Error('Stripe is down'));
      const manager = createManager();
      await assert.rejects(manager.start(), /Stripe is down/);

      assert.equal(await manager.parseWebhook(BODY, signedWith(STORED.secret)), EVENT);

      assert.equal(manager.webhookSecret, STORED.secret);
    });

    it('never reads the stored secret when the secret comes from config', async function () {
      const manager = await startManager({ webhookSecret: 'whsec_config' });

      assert.equal(await manager.parseWebhook(BODY, signedWith('whsec_config')), EVENT);
      await assert.rejects(manager.parseWebhook(BODY, 'bad'), /No signatures found/);

      sinon.assert.notCalled(store.readSecret);
      assert.equal(manager.webhookSecret, 'whsec_config');
    });
  });
});
