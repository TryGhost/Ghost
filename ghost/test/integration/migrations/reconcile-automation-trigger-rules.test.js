const assert = require('node:assert/strict');
const ObjectId = require('bson-objectid');
const testUtils = require('../../utils');
const { knex } = require('../../../core/server/data/db');
const migration = require('../../../core/server/data/migrations/versions/6.73/2026-10-22-16-27-00-reconcile-automation-trigger-rules');

const id = () => ObjectId().toHexString();

describe('Reconcile automation trigger rules at backend cutover', function () {
  let signupId;
  let transitionId;
  let originalRules;

  beforeAll(async function () {
    await testUtils.startGhost();
  });
  beforeEach(async function () {
    signupId = id();
    transitionId = id();
    await knex('automations').insert([
      {
        id: signupId,
        name: 'Signup',
        trigger_type: 'membership_started',
        trigger_tier_scope: 'all_paid',
        created_at: new Date(),
      },
      {
        id: transitionId,
        name: 'Change',
        trigger_type: 'paid_subscription_changed',
        trigger_tier_scope: null,
        created_at: new Date(),
      },
    ]);
    originalRules = [
      {
        id: id(),
        automation_id: signupId,
        trigger_type: 'membership_started',
        from_scope: null,
        from_product_id: null,
        to_scope: 'free',
        to_product_id: null,
      },
      {
        id: id(),
        automation_id: transitionId,
        trigger_type: 'paid_subscription_changed',
        from_scope: 'all_paid',
        from_product_id: null,
        to_scope: 'free',
        to_product_id: null,
      },
    ];
    await knex('automation_trigger_rules').insert(originalRules);
  });
  afterEach(async function () {
    await knex('automations').whereIn('id', [signupId, transitionId]).delete();
  });

  it('refreshes stale signup rules and leaves transitions and legacy data unchanged', async function () {
    const before = await knex('automations').whereIn('id', [signupId, transitionId]).orderBy('id');
    await knex.transaction((transacting) => migration.up({ transacting }));
    assert.equal(
      (await knex('automation_trigger_rules').where('automation_id', signupId).first()).to_scope,
      'all_paid',
    );
    assert.deepEqual(await knex('automation_trigger_rules').where('automation_id', transitionId), [
      originalRules[1],
    ]);
    assert.deepEqual(
      await knex('automations').whereIn('id', [signupId, transitionId]).orderBy('id'),
      before,
    );
    await knex.transaction((transacting) => migration.up({ transacting }));
    assert.equal(
      (await knex('automation_trigger_rules').where('automation_id', signupId)).length,
      1,
    );
    await knex('automations').where('id', signupId).update('trigger_tier_scope', null);
    await knex.transaction((transacting) => migration.up({ transacting }));
    assert.deepEqual(await knex('automation_trigger_rules').where('automation_id', signupId), []);
  });

  it('rolls back replacements on a transaction failure', async function () {
    await assert.rejects(
      knex.transaction(async (transacting) => {
        await migration.up({ transacting });
        throw new Error('abort cutover');
      }),
      /abort cutover/,
    );
    assert.deepEqual(await knex('automation_trigger_rules').where('automation_id', signupId), [
      originalRules[0],
    ]);
  });
});
