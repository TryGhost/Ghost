const assert = require('node:assert/strict');
const ObjectId = require('bson-objectid');
const testUtils = require('../../utils');
const { knex } = require('../../../core/server/data/db');
const rulesMigration = require('../../../core/server/data/migrations/versions/6.73/2026-10-22-15-58-25-add-automation-trigger-rules');

const id = () => ObjectId().toHexString();
const now = new Date('2026-10-22T12:00:00Z');

describe('Automation trigger rule schema', function () {
  let automationId;
  let bronze;
  let gold;

  beforeAll(async function () {
    await testUtils.startGhost();
  });

  beforeEach(async function () {
    automationId = id();
    bronze = id();
    gold = id();
    await knex('automations').insert({
      id: automationId,
      name: 'Rule schema test',
      trigger_type: 'membership_started',
      trigger_tier_scope: 'free',
      created_at: now,
    });
    await knex('products').insert(
      [bronze, gold].map((productId) => ({
        id: productId,
        name: productId,
        slug: productId,
        created_at: now,
      })),
    );
  });

  afterEach(async function () {
    await knex('automations').where('id', automationId).del();
    await knex('products').whereIn('id', [bronze, gold]).del();
  });

  const signup = (ownerId, overrides = {}) => ({
    id: id(),
    automation_id: ownerId,
    trigger_type: 'membership_started',
    from_scope: null,
    from_product_id: null,
    to_scope: 'free',
    to_product_id: null,
    ...overrides,
  });

  it('accepts alternative signup targets', async function () {
    assert.equal(
      (await knex('automations').where('id', automationId).first()).trigger_type,
      'membership_started',
    );
    await knex('automation_trigger_rules').insert([
      signup(automationId),
      signup(automationId, { to_scope: 'all_paid' }),
      signup(automationId, { to_scope: 'specific_tier', to_product_id: gold }),
    ]);
    assert.equal(
      (await knex('automation_trigger_rules').where('automation_id', automationId)).length,
      3,
    );
  });

  it('stores complete paid transition pairs and dynamic all-paid scopes', async function () {
    await knex('automations')
      .where('id', automationId)
      .update('trigger_type', 'paid_subscription_changed');
    await knex('automation_trigger_rules').insert([
      signup(automationId, {
        trigger_type: 'paid_subscription_changed',
        from_scope: 'specific_tier',
        from_product_id: bronze,
        to_scope: 'specific_tier',
        to_product_id: gold,
      }),
      signup(automationId, {
        trigger_type: 'paid_subscription_changed',
        from_scope: 'all_paid',
        to_scope: 'free',
      }),
      signup(automationId, {
        trigger_type: 'paid_subscription_changed',
        from_scope: 'specific_tier',
        from_product_id: gold,
        to_scope: 'all_paid',
      }),
    ]);
    const rows = await knex('automation_trigger_rules').where('automation_id', automationId);
    assert.equal(rows.length, 3);
    assert(rows.some((row) => row.from_product_id === bronze && row.to_product_id === gold));
  });

  it('rejects a mismatched event type, missing owner and nonexistent source or destination tiers', async function () {
    for (const overrides of [
      { trigger_type: 'paid_subscription_changed', from_scope: 'all_paid' },
      { automation_id: id() },
      { to_scope: 'specific_tier', to_product_id: id() },
    ]) {
      await assert.rejects(
        knex('automation_trigger_rules').insert(signup(automationId, overrides)),
        /foreign key constraint fails/,
      );
    }
    await knex('automations')
      .where('id', automationId)
      .update('trigger_type', 'paid_subscription_changed');
    await assert.rejects(
      knex('automation_trigger_rules').insert(
        signup(automationId, {
          trigger_type: 'paid_subscription_changed',
          from_scope: 'specific_tier',
          from_product_id: id(),
        }),
      ),
      /foreign key constraint fails/,
    );
  });

  it('requires a destination and prevents changing the parent type under existing rules', async function () {
    await assert.rejects(
      knex('automation_trigger_rules').insert(signup(automationId, { to_scope: null })),
      /cannot be null/,
    );
    await knex('automation_trigger_rules').insert(signup(automationId));
    await assert.rejects(
      knex('automations')
        .where('id', automationId)
        .update('trigger_type', 'paid_subscription_changed'),
      /foreign key constraint fails/,
    );
  });

  it('keeps archived tiers, restricts hard deletion on both sides and cascades automation deletion', async function () {
    await knex('automations')
      .where('id', automationId)
      .update('trigger_type', 'paid_subscription_changed');
    await knex('automation_trigger_rules').insert(
      signup(automationId, {
        trigger_type: 'paid_subscription_changed',
        from_scope: 'specific_tier',
        from_product_id: bronze,
        to_scope: 'specific_tier',
        to_product_id: gold,
      }),
    );
    await knex('products').where('id', gold).update('active', false);
    for (const productId of [bronze, gold]) {
      await assert.rejects(
        knex('products').where('id', productId).del(),
        /foreign key constraint fails/,
      );
    }
    await knex('automations').where('id', automationId).del();
    assert.deepEqual(
      await knex('automation_trigger_rules').where('automation_id', automationId),
      [],
    );
  });

  it('can repeat DDL, roll back in dependency order and migrate forward without changing legacy data', async function () {
    const before = await knex('automations').where('id', automationId).first();
    await rulesMigration.up({ connection: knex });
    await rulesMigration.down({ connection: knex });
    await rulesMigration.down({ connection: knex });
    assert.equal(await knex.schema.hasColumn('automations', 'trigger_type'), true);
    assert.equal(
      (await knex('automations').where('id', automationId).first()).trigger_tier_scope,
      'free',
    );
    await rulesMigration.up({ connection: knex });
    assert.deepEqual(await knex('automations').where('id', automationId).first(), before);
    // Check the FK was rebuilt too, rather than only checking table existence.
    await assert.rejects(
      knex('automation_trigger_rules').insert(
        signup(automationId, { trigger_type: 'paid_subscription_changed' }),
      ),
      /foreign key constraint fails/,
    );
  });
});
