const assert = require('node:assert/strict');
const ObjectId = require('bson-objectid');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const testUtils = require('../../utils');
const { knex } = require('../../../core/server/data/db');
const migration = require('../../../core/server/data/migrations/versions/6.73/2026-10-22-15-58-25-backfill-automation-trigger-rules');

const id = () => ObjectId().toHexString();
const now = new Date('2026-10-22T12:00:00Z');
const run = () => knex.transaction((transacting) => migration.up({ transacting }));

describe('Backfill automation trigger rules', function () {
  let automationIds;
  let productIds;
  let warn;

  async function automation(scope, overrides = {}) {
    const automationId = id();
    automationIds.push(automationId);
    await knex('automations').insert({
      id: automationId,
      name: 'Backfill test',
      trigger_type: 'membership_started',
      trigger_tier_scope: scope,
      created_at: now,
      ...overrides,
    });
    return automationId;
  }

  async function product(active = true) {
    const productId = id();
    productIds.push(productId);
    await knex('products').insert({
      id: productId,
      name: productId,
      slug: productId,
      active,
      created_at: now,
    });
    return productId;
  }

  const rules = () =>
    knex('automation_trigger_rules').whereIn('automation_id', automationIds).orderBy('id');

  beforeAll(async function () {
    await testUtils.startGhost();
  });

  beforeEach(function () {
    automationIds = [];
    productIds = [];
    warn = sinon.stub(logging, 'warn');
  });

  afterEach(async function () {
    sinon.restore();
    await knex('automations').whereIn('id', automationIds).del();
    await knex('products').whereIn('id', productIds).del();
  });

  it('copies free, all-paid and selected-tier signup flows without changing their status or legacy configuration', async function () {
    const free = await automation('free', { status: 'active' });
    const paid = await automation('all_paid', { status: 'inactive' });
    const selected = await automation('selected_paid', { status: 'archived' });
    const bronze = await product();
    const gold = await product(false);
    const legacyTiers = [bronze, gold].map((product_id) => ({
      automation_id: selected,
      product_id,
    }));
    await knex('automation_trigger_tiers').insert(legacyTiers);
    const before = await knex('automations').whereIn('id', automationIds).orderBy('id');
    await run();
    const rows = await rules();
    assert.equal(rows.length, 4);
    assert.deepEqual(
      rows.filter((row) => row.automation_id === free).map((row) => row.to_scope),
      ['free'],
    );
    assert.deepEqual(
      rows.filter((row) => row.automation_id === paid).map((row) => row.to_scope),
      ['all_paid'],
    );
    assert.deepEqual(
      rows
        .filter((row) => row.automation_id === selected)
        .map((row) => row.to_product_id)
        .sort(),
      [bronze, gold].sort(),
    );
    assert(
      rows.every(
        (row) =>
          row.trigger_type === 'membership_started' &&
          row.from_scope === null &&
          row.from_product_id === null,
      ),
    );
    assert(
      rows
        .filter((row) => row.to_scope !== 'specific_tier')
        .every((row) => row.to_product_id === null),
    );
    assert.deepEqual(await knex('automations').whereIn('id', automationIds).orderBy('id'), before);
    assert.deepEqual(
      await knex('automation_trigger_tiers').where('automation_id', selected).orderBy('product_id'),
      legacyTiers.sort((a, b) => a.product_id.localeCompare(b.product_id)),
    );
  });

  it('backfills welcome flows by their current scope, without overriding edited welcome configuration', async function () {
    // Existing boot-created welcome automations may already own the real slugs.
    // Reuse those rows inside a rolled-back transaction to test the actual slugs.
    await knex.transaction(async (trx) => {
      for (const [slug, scope] of [
        ['member-welcome-email-free', 'free'],
        ['member-welcome-email-paid', 'all_paid'],
      ]) {
        let row = await trx('automations').where({ slug }).first();
        if (!row) {
          row = { id: id(), name: slug, slug, trigger_type: 'membership_started', created_at: now };
          await trx('automations').insert(row);
        }
        await trx('automation_trigger_rules').where('automation_id', row.id).del();
        await trx('automations').where('id', row.id).update('trigger_tier_scope', scope);
      }
      await migration.up({ transacting: trx });
      const rows = await trx('automation_trigger_rules as rule')
        .join('automations as a', 'a.id', 'rule.automation_id')
        .whereIn('a.slug', ['member-welcome-email-free', 'member-welcome-email-paid'])
        .select('a.slug', 'rule.to_scope')
        .orderBy('a.slug');
      assert.deepEqual(rows, [
        { slug: 'member-welcome-email-free', to_scope: 'free' },
        { slug: 'member-welcome-email-paid', to_scope: 'all_paid' },
      ]);
      const paid = await trx('automations').where('slug', 'member-welcome-email-paid').first();
      await trx('automation_trigger_rules').where('automation_id', paid.id).del();
      await trx('automations').where('id', paid.id).update('trigger_tier_scope', null);
      await migration.up({ transacting: trx });
      assert.deepEqual(await trx('automation_trigger_rules').where('automation_id', paid.id), []);
      await trx.rollback();
    });
  });

  it('leaves unconfigured, empty selected-tier and unknown scopes unmatched, logging invalid data', async function () {
    await automation(null);
    const empty = await automation('selected_paid');
    const unknown = await automation('unexpected');
    await run();
    assert.deepEqual(await rules(), []);
    assert(warn.calledWithMatch(`No trigger tiers to backfill for automation ${empty}`));
    assert(
      warn.calledWithMatch(`Skipping unexpected trigger tier scope for automation ${unknown}`),
    );
  });

  it('preserves existing rules and skips paid-change automations, including ones without rules', async function () {
    const existing = await automation('free');
    const transition = await automation('all_paid', { trigger_type: 'paid_subscription_changed' });
    await automation('all_paid', { trigger_type: 'paid_subscription_changed' });
    await knex('automation_trigger_rules').insert([
      {
        id: id(),
        automation_id: existing,
        trigger_type: 'membership_started',
        to_scope: 'all_paid',
      },
      {
        id: id(),
        automation_id: transition,
        trigger_type: 'paid_subscription_changed',
        from_scope: 'all_paid',
        to_scope: 'free',
      },
    ]);
    const before = await rules();
    await run();
    assert.deepEqual(await rules(), before);
  });

  it('is idempotent, preserving rule IDs and keeping copied data until table rollback', async function () {
    const selected = await automation('selected_paid');
    await automation('all_paid');
    await knex('automation_trigger_tiers').insert({
      automation_id: selected,
      product_id: await product(),
    });
    await run();
    const before = await rules();
    await run();
    assert.deepEqual(await rules(), before);
    await knex.transaction((transacting) => migration.down({ transacting }));
    assert.deepEqual(await rules(), before);
  });

  it('crosses both automation and tier batch boundaries without losing or duplicating rules', async function () {
    const records = Array.from({ length: 101 }, () => ({
      id: id(),
      name: 'Batch backfill',
      trigger_type: 'membership_started',
      trigger_tier_scope: 'free',
      created_at: now,
    }));
    automationIds.push(...records.map((row) => row.id));
    await knex('automations').insert(records);
    const selected = await automation('selected_paid');
    const tiers = Array.from({ length: 101 }, () => {
      const productId = id();
      return { id: productId, name: productId, slug: productId, created_at: now };
    });
    productIds.push(...tiers.map((row) => row.id));
    await knex('products').insert(tiers);
    await knex('automation_trigger_tiers').insert(
      tiers.map((row) => ({ automation_id: selected, product_id: row.id })),
    );
    await run();
    const rows = await rules();
    assert.equal(rows.length, 202);
    assert.deepEqual(
      rows
        .filter((row) => row.automation_id === selected)
        .map((row) => row.to_product_id)
        .sort(),
      productIds.toSorted(),
    );
    assert.deepEqual(
      [...new Set(rows.map((row) => row.automation_id))].sort(),
      automationIds.toSorted(),
    );
    await run();
    assert.deepEqual(await rules(), rows);
  });

  it('rolls back inserted rows on failure and can then retry successfully', async function () {
    await automation('free');
    await assert.rejects(
      knex.transaction(async (transacting) => {
        await migration.up({ transacting });
        assert.equal(
          (await transacting('automation_trigger_rules').whereIn('automation_id', automationIds))
            .length,
          1,
        );
        throw new Error('Interrupted before commit');
      }),
      /Interrupted before commit/,
    );
    assert.deepEqual(await rules(), []);
    await run();
    assert.equal((await rules()).length, 1);
  });
});
