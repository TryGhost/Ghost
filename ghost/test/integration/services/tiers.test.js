const assert = require('node:assert/strict');
const ObjectID = require('bson-objectid').default;
const db = require('../../../core/server/data/db');
const metafields = require('../../../core/server/services/members-metafields');
const tiersService = require('../../../core/server/services/tiers').default;
const testUtils = require('../../utils');

// The tiers are loaded into memory the first time one is read. These cover that first read
// against a real database.
describe('Tiers repository', function () {
  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup('default'));
  afterAll(testUtils.teardownDb);

  beforeAll(async function () {
    // Tier requirements read which ports are bound to a custom field.
    metafields.init();
    await tiersService.init();
  });

  beforeEach(function () {
    tiersService.service.repository.reload();
  });

  const paidTier = (id, name) => ({
    id,
    name,
    slug: id,
    type: 'paid',
    active: true,
    visibility: 'public',
    currency: 'usd',
    monthly_price: 900,
    yearly_price: 9000,
    created_at: new Date('2030-01-01T00:00:00.000Z'),
  });

  it('loads the tiers on a first read made inside a transaction, through that transaction', async function () {
    const id = new ObjectID().toHexString();

    // Rolled back by the error, so nothing it wrote is left behind.
    const rollback = new Error('Rolled back on purpose');
    await assert.rejects(
      db.knex.transaction(async (transacting) => {
        await transacting('products').insert(paidTier(id, 'Written in the transaction'));

        // SQLite has one connection, which this transaction holds: a load made outside it
        // would wait for the transaction, which is waiting for the load.
        const tier = await tiersService.service.api.read(id, { transacting });
        assert.equal(tier.name, 'Written in the transaction');

        throw rollback;
      }),
      (error) => error === rollback,
    );

    // What the transaction saw was not kept: the tier it rolled back is not served afterwards.
    assert.equal(await tiersService.service.api.read(id), null);
    const page = await tiersService.service.api.browse();
    assert.ok(page.data.length > 0);
    assert.ok(page.data.every((tier) => tier.id.toHexString() !== id));
  });

  it('serves a tier written to the database behind it only after a reload', async function () {
    const id = new ObjectID().toHexString();
    await tiersService.service.api.browse();
    await db.knex('products').insert(paidTier(id, 'Written behind the cache'));

    try {
      assert.equal(await tiersService.service.api.read(id), null);

      tiersService.service.repository.reload();

      const tier = await tiersService.service.api.read(id);
      assert.equal(tier.name, 'Written behind the cache');
    } finally {
      await db.knex('products').where({ id }).del();
      tiersService.service.repository.reload();
    }
  });
});
