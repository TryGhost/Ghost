import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import sinon from 'sinon';
import {
  WebhookStore,
  type StoredWebhook,
} from '../../../../core/server/services/stripe/webhook-store';

const testUtils = require('../../../utils');
const { mockManager } = require('../../../utils/e2e-framework');
const db = require('../../../../core/server/data/db');
const models = require('../../../../core/server/models');
const WebhookManager = require('../../../../core/server/services/stripe/webhook-manager');
const settingsCache = require('../../../../core/shared/settings-cache');
const StripeAPI = require('../../../../core/server/services/stripe/stripe-api');
const { Stripe } = require('stripe');

const ID_SETTING = 'members_stripe_webhook_id';
const SECRET_SETTING = 'members_stripe_webhook_secret';
const HANDLER_URL = 'https://site.example/members/webhooks/stripe/';
const OLD: StoredWebhook = { webhook_id: 'we_old', secret: 'whsec_old' };
const NOTHING: StoredWebhook = { webhook_id: null, secret: null };
const EVENT = JSON.stringify({ id: 'evt_1', object: 'event', type: 'charge.refunded' });

const CREATE_MS = 50;
const STRIPE_IS_DOWN = [500, { error: { type: 'api_error', message: 'Stripe is down' } }];

type Operation = 'create' | 'update' | 'delete';
type Endpoint = { id: string; url: string; api_version: string; secret: string };

const operationOf = ({ method, id }: { method: string; id?: string }): Operation => {
  if (method === 'DELETE') {
    return 'delete';
  }
  return id ? 'update' : 'create';
};

const signedWith = (secret: string): string =>
  new Stripe('sk_live_fake').webhooks.generateTestHeaderString({ payload: EVENT, secret });

describe('Stripe webhook: Ghosts serving one site', function () {
  const stripe = mockManager.stripeMocker;
  let beforeUpdate: (() => Promise<void>) | null;
  let runningCreates: number;
  let createsOverlapped: boolean;

  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup('settings'));
  afterAll(testUtils.teardownDb);
  beforeEach(function () {
    mockManager.mockStripe();
    beforeUpdate = null;
    runningCreates = 0;
    createsOverlapped = false;
    stripe.beforeReply = async (request: { method: string; id?: string }) => {
      const operation = operationOf(request);
      if (operation === 'update') {
        await beforeUpdate?.();
      }
      if (operation === 'create') {
        runningCreates += 1;
        createsOverlapped ||= runningCreates > 1;
        await sleep(CREATE_MS);
        runningCreates -= 1;
      }
    };
  });
  afterEach(function () {
    mockManager.restore();
  });

  const calls = (): Operation[] => stripe.requests.map(operationOf);
  const count = (operation: Operation) => calls().filter((call) => call === operation).length;
  const endpoints = (): Endpoint[] => stripe.webhookEndpoints;

  function fail(operation: Operation, times?: number) {
    const only = {
      create: { method: 'POST', id: null },
      update: { method: 'POST', id: OLD.webhook_id },
      delete: { method: 'DELETE' },
    }[operation];
    stripe.failures.push({ resource: 'webhook_endpoints', ...only, times, reply: STRIPE_IS_DOWN });
  }

  /** Answers no update until `expected` of them have arrived, so every Ghost sees the same answer. */
  function alignUpdates(expected: number) {
    const all = Promise.withResolvers<void>();
    let arrived = 0;
    beforeUpdate = async () => {
      arrived += 1;
      if (arrived >= expected) {
        all.resolve();
      }
      await all.promise;
    };
  }

  /** Holds back Stripe's answer to the next update, after Stripe has made the update. */
  function holdNextUpdateAnswer() {
    const made = Promise.withResolvers<void>();
    const held = Promise.withResolvers<void>();
    stripe.beforeDelivery = async (request: { method: string; id?: string }) => {
      if (operationOf(request) !== 'update') {
        return;
      }
      stripe.beforeDelivery = null;
      made.resolve();
      await held.promise;
    };
    return { made: made.promise, send: held.resolve };
  }

  async function store(webhook: StoredWebhook) {
    await db.knex('settings').where('key', ID_SETTING).update({ value: webhook.webhook_id });
    await db.knex('settings').where('key', SECRET_SETTING).update({ value: webhook.secret });
  }

  async function stored(): Promise<StoredWebhook> {
    const rows: { key: string; value: string | null }[] = await db
      .knex('settings')
      .whereIn('key', [ID_SETTING, SECRET_SETTING])
      .select('key', 'value');
    const valueOf = (key: string) => rows.find((row) => row.key === key)?.value ?? null;
    return { webhook_id: valueOf(ID_SETTING), secret: valueOf(SECRET_SETTING) };
  }

  function createGhost(loaded: StoredWebhook, config: { webhookSecret?: string } = {}) {
    const settings: Record<string, string | null> = {
      [ID_SETTING]: loaded.webhook_id,
      [SECRET_SETTING]: loaded.secret,
    };
    const webhookStore = new WebhookStore({
      settingsCache: { get: (key) => settings[key] },
      Settings: models.Settings,
      transaction: (fn) => models.Base.transaction(fn),
      lockWaitMs: 200,
    });
    const api = new StripeAPI({ labs: { isSet: () => false }, tracking: {} });
    api.configure({ secretKey: 'sk_live_fake', publicKey: 'pk_live_fake', testEnv: true });
    const manager = new WebhookManager({ api, StripeWebhook: webhookStore });
    manager.configure({ webhookHandlerUrl: HANDLER_URL, ...config });
    return {
      manager,
      transaction: sinon.spy(webhookStore, 'transaction'),
      save: sinon.spy(webhookStore, 'save'),
      readSecret: sinon.spy(webhookStore, 'readSecret'),
    };
  }

  type Ghost = ReturnType<typeof createGhost>;

  async function startTwoGhosts(loaded: StoredWebhook) {
    await store(loaded);
    const ghosts = [createGhost(loaded), createGhost(loaded)];
    await Promise.all(ghosts.map((ghost) => ghost.manager.start()));
    return ghosts;
  }

  const seedOld = (apiVersion = StripeAPI.API_VERSION) =>
    stripe.webhookEndpoints.push({
      id: 'we_old',
      url: HANDLER_URL,
      api_version: apiVersion,
      secret: 'whsec_old',
    });

  async function assertOneNewWebhook(ghosts: Ghost[]) {
    const [endpoint] = endpoints();
    assert.equal(count('create'), 1);
    assert.equal(endpoints().length, 1);
    assert.deepEqual(await stored(), { webhook_id: endpoint.id, secret: endpoint.secret });
    for (const ghost of ghosts) {
      assert.equal(ghost.manager.webhookSecret, endpoint.secret);
    }
  }

  function assertNothingWritten(ghosts: Ghost[]) {
    for (const ghost of ghosts) {
      sinon.assert.notCalled(ghost.transaction);
      sinon.assert.notCalled(ghost.save);
      assert.equal(ghost.manager.webhookSecret, OLD.secret);
    }
  }

  it('updates the stored webhook and writes nothing', async function () {
    seedOld();
    await store(OLD);
    const ghost = createGhost(OLD);

    await ghost.manager.start();

    assert.deepEqual(calls(), ['update']);
    assertNothingWritten([ghost]);
    assert.deepEqual(await stored(), OLD);
  });

  it('updates the stored webhook from two Ghosts and writes nothing', async function () {
    seedOld();

    const ghosts = await startTwoGhosts(OLD);

    assert.deepEqual(calls(), ['update', 'update']);
    assertNothingWritten(ghosts);
    assert.deepEqual(await stored(), OLD);
  });

  it('creates and saves a webhook when nothing is stored', async function () {
    await store(NOTHING);
    const ghost = createGhost(NOTHING);

    await ghost.manager.start();

    assert.deepEqual(calls(), ['create']);
    await assertOneNewWebhook([ghost]);
    const [endpoint] = endpoints();
    assert.equal(settingsCache.get(ID_SETTING), endpoint.id);
    assert.equal(settingsCache.get(SECRET_SETTING), endpoint.secret);
  });

  it('creates one webhook from two Ghosts when nothing is stored', async function () {
    const ghosts = await startTwoGhosts(NOTHING);

    assert.equal(count('delete'), 0);
    await assertOneNewWebhook(ghosts);
  });

  it('creates one webhook from two Ghosts when the stored one is gone at Stripe', async function () {
    alignUpdates(2);

    const ghosts = await startTwoGhosts(OLD);

    assert.equal(count('delete'), 0);
    await assertOneNewWebhook(ghosts);
  });

  it('replaces the webhook once from two Ghosts when it is on the wrong version', async function () {
    seedOld('2019-01-01');
    alignUpdates(2);

    const ghosts = await startTwoGhosts(OLD);

    assert.equal(
      endpoints().some((endpoint) => endpoint.id === 'we_old'),
      false,
    );
    await assertOneNewWebhook(ghosts);
  });

  it('replaces the webhook once from two Ghosts when the update fails for both', async function () {
    seedOld();
    fail('update');
    alignUpdates(2);

    const ghosts = await startTwoGhosts(OLD);

    assert.equal(
      endpoints().some((endpoint) => endpoint.id === 'we_old'),
      false,
    );
    await assertOneNewWebhook(ghosts);
  });

  it('keeps the new webhook when the update worked for the other Ghost', async function () {
    seedOld();
    await store(OLD);
    const updating = createGhost(OLD);
    const replacing = createGhost(OLD);
    const answer = holdNextUpdateAnswer();
    const updated = updating.manager.start();
    await answer.made;
    fail('update', 1);

    await replacing.manager.start();
    answer.send();
    await updated;

    sinon.assert.notCalled(updating.transaction);
    sinon.assert.notCalled(updating.save);
    await assertOneNewWebhook([replacing]);
  });

  it('creates from the waiting Ghost when the create fails for the first', async function () {
    await store(NOTHING);
    fail('create', 1);
    const ghosts = [createGhost(NOTHING), createGhost(NOTHING)];

    const starts = await Promise.allSettled(ghosts.map((ghost) => ghost.manager.start()));

    assert.deepEqual(starts.map((start) => start.status).sort(), ['fulfilled', 'rejected']);
    assert.equal(count('create'), 2);
    assert.equal(createsOverlapped, false);
    assert.equal(endpoints().length, 1);
    const [endpoint] = endpoints();
    assert.deepEqual(await stored(), { webhook_id: endpoint.id, secret: endpoint.secret });
    const started = ghosts[starts.findIndex((start) => start.status === 'fulfilled')];
    assert.equal(started.manager.webhookSecret, endpoint.secret);
  });

  it('creates the webhook when deleting the old one fails', async function () {
    seedOld('2019-01-01');
    fail('delete');
    await store(OLD);
    const ghost = createGhost(OLD);

    await ghost.manager.start();

    assert.deepEqual(calls(), ['update', 'delete', 'create']);
    const created = endpoints().find((endpoint) => endpoint.id !== 'we_old');
    assert.deepEqual(await stored(), { webhook_id: created?.id, secret: created?.secret });
    assert.equal(ghost.manager.webhookSecret, created?.secret);
  });

  it('calls nothing when the webhook secret comes from config', async function () {
    await store(NOTHING);
    const ghost = createGhost(NOTHING, { webhookSecret: 'whsec_config' });

    await ghost.manager.start();

    assert.deepEqual(calls(), []);
    sinon.assert.notCalled(ghost.transaction);
    assert.equal(ghost.manager.webhookSecret, 'whsec_config');
    assert.deepEqual(await stored(), NOTHING);
  });

  it('fails the start without calling Stripe when the lock wait runs out', async function () {
    await store(NOTHING);
    const ghost = createGhost(NOTHING);
    const holder = await db.knex.transaction();
    await holder('settings').whereIn('key', [ID_SETTING, SECRET_SETTING]).forUpdate().select('id');

    try {
      await assert.rejects(ghost.manager.start(), /Timed out waiting for another Ghost/);
    } finally {
      await holder.rollback();
    }

    assert.deepEqual(calls(), []);
    assert.deepEqual(await stored(), NOTHING);
  });

  it('accepts an event signed with the secret another Ghost stored', async function () {
    seedOld();
    await store(OLD);
    const ghost = createGhost(OLD);
    await ghost.manager.start();
    await store({ webhook_id: 'we_new', secret: 'whsec_new' });

    const first = await ghost.manager.parseWebhook(EVENT, signedWith('whsec_new'));
    const second = await ghost.manager.parseWebhook(EVENT, signedWith('whsec_new'));

    assert.equal(first.id, 'evt_1');
    assert.equal(second.id, 'evt_1');
    sinon.assert.calledOnce(ghost.readSecret);
    assert.equal(ghost.manager.webhookSecret, 'whsec_new');
  });

  it('accepts an event signed with the stored secret when Stripe fails at start', async function () {
    seedOld();
    fail('update');
    fail('create');
    await store(OLD);
    const ghost = createGhost(OLD);
    await assert.rejects(ghost.manager.start());

    const event = await ghost.manager.parseWebhook(EVENT, signedWith(OLD.secret as string));

    assert.equal(event.id, 'evt_1');
    sinon.assert.notCalled(ghost.readSecret);
  });

  it('checks events with the secret from config and never reads the stored one', async function () {
    await store(OLD);
    const ghost = createGhost(OLD, { webhookSecret: 'whsec_config' });
    await ghost.manager.start();

    const event = await ghost.manager.parseWebhook(EVENT, signedWith('whsec_config'));
    await assert.rejects(ghost.manager.parseWebhook(EVENT, signedWith(OLD.secret as string)));

    assert.equal(event.id, 'evt_1');
    sinon.assert.notCalled(ghost.readSecret);
  });
});
