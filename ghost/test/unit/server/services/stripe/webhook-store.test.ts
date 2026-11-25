import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import sinon from 'sinon';
import { WebhookStore } from '../../../../../core/server/services/stripe/webhook-store';

const WebhookManager = require('../../../../../core/server/services/stripe/webhook-manager');

const ID_SETTING = 'members_stripe_webhook_id';
const SECRET_SETTING = 'members_stripe_webhook_secret';

describe('WebhookStore', function () {
  let knex: Knex;
  let queries: string[];
  let settingsCache: { get: sinon.SinonStub };
  let store: WebhookStore;

  beforeEach(async function () {
    knex = createKnex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      pool: { min: 1, max: 1 },
      useNullAsDefault: true,
    });
    await knex.schema.createTable('settings', (table) => {
      table.increments('id');
      table.string('key', 50).unique();
      table.text('value').nullable();
    });
    await knex('settings').insert([
      { key: ID_SETTING, value: null },
      { key: SECRET_SETTING, value: null },
    ]);
    queries = [];
    knex.on('query', ({ sql }: { sql: string }) => queries.push(sql));
    settingsCache = { get: sinon.stub().returns(null) };
    store = new WebhookStore({
      settingsCache,
      transaction: (fn) => knex.transaction(fn),
      Settings: {
        async edit(data, options = {}) {
          for (const { key, value } of data) {
            await (options.transacting ?? knex)('settings').where('key', key).update({ value });
          }
        },
      },
    });
  });

  afterEach(async function () {
    sinon.restore();
    await knex.destroy();
  });

  const stored = async () =>
    Object.fromEntries(
      (await knex('settings').select('key', 'value')).map(({ key, value }) => [key, value]),
    );

  it('gets the webhook from the settings cache', async function () {
    settingsCache.get.withArgs(ID_SETTING).returns('we_cached');
    settingsCache.get.withArgs(SECRET_SETTING).returns('whsec_cached');

    assert.deepEqual(await store.get(), { webhook_id: 'we_cached', secret: 'whsec_cached' });
    assert.deepEqual(queries, []);
  });

  it('gets the webhook from the database inside a transaction', async function () {
    await store.save({ webhook_id: 'we_saved', secret: 'whsec_saved' });

    const webhook = await store.transaction((transacting) => store.getForUpdate(transacting));

    assert.deepEqual(webhook, { webhook_id: 'we_saved', secret: 'whsec_saved' });
  });

  it('creates and saves a webhook on SQLite without lock SQL', async function () {
    const api = {
      createWebhookEndpoint: sinon.stub().resolves({ id: 'we_created', secret: 'whsec_created' }),
    };
    const manager = new WebhookManager({ api, StripeWebhook: store });
    manager.configure({ webhookHandlerUrl: 'https://site.example/members/webhooks/stripe/' });

    await manager.start();

    assert.deepEqual(await stored(), {
      [ID_SETTING]: 'we_created',
      [SECRET_SETTING]: 'whsec_created',
    });
    assert.equal(manager.webhookSecret, 'whsec_created');
    assert.equal(
      queries.some((sql) => /for update/i.test(sql)),
      false,
    );
  });
});
