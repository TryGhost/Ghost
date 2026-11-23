import { afterEach, beforeAll, beforeEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import type { Automation } from '../../../core/server/services/automations/automations-repository';
import { agentProvider, fixtureManager, mockManager } from '../../utils/e2e-framework';
import {
  setupAutomationsFixture,
  cleanupAutomationsFixture,
} from '../../utils/automations-fixtures';
const models = require('../../../core/server/models');

const newId = () => ObjectId().toHexString();

describe('Deleting automation trigger labels', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  const db: Knex = models.Base.knex;
  let labelId: string;
  let replacementId: string;
  let memberId: string;
  let automationIds: string[];

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(async function () {
    await setupAutomationsFixture();
    mockManager.mockLabsEnabled('automations');
    mockManager.mockLabsEnabled('automationsLeadMagnets');
    labelId = newId();
    replacementId = newId();
    memberId = newId();
    automationIds = await db('automations').orderBy('id').pluck('id');
    await db('labels').insert(
      [labelId, replacementId].map((id) => ({ id, name: id, slug: id, created_at: new Date() })),
    );
    await db('members').insert({
      id: memberId,
      uuid: randomUUID(),
      transient_id: newId(),
      email: `${memberId}@example.com`,
      created_at: new Date(),
    });
    await db('members_labels').insert(
      [labelId, replacementId].map((id, index) => ({
        id: newId(),
        member_id: memberId,
        label_id: id,
        sort_order: index,
      })),
    );
  });

  afterEach(async function () {
    mockManager.restore();
    await cleanupAutomationsFixture();
    await db('members_labels').where('member_id', memberId).del();
    await db('members').where('id', memberId).del();
    await db('labels').whereIn('id', [labelId, replacementId]).del();
  });

  async function read(id: string): Promise<Automation> {
    const { body } = await agent.get(`automations/${id}`).expectStatus(200);
    return body.automations[0];
  }

  async function configure({
    id,
    status,
  }: {
    id: string;
    status: 'active' | 'inactive' | 'archived';
  }) {
    await db('automations').where('id', id).update({ status });
    await db('automation_trigger_rules').where('automation_id', id).update({
      trigger_type: 'label_added',
      label_id: labelId,
      scope: null,
      product_id: null,
      direction: null,
    });
    return read(id);
  }

  async function state() {
    return {
      labels: await db('labels').whereIn('id', [labelId, replacementId]).orderBy('id'),
      links: await db('members_labels').where('member_id', memberId).orderBy('id'),
      rules: await db('automation_trigger_rules')
        .whereIn('automation_id', automationIds)
        .orderBy('id'),
    };
  }

  function activation(automation: Automation) {
    const { actions, edges } = automation;
    return agent
      .put(`automations/${automation.id}`)
      .body({ automations: [{ status: 'active', actions, edges }] });
  }

  function queryAttempt(predicate: (query: { sql: string; bindings?: unknown[] }) => boolean) {
    const pending = Promise.withResolvers<void>();
    const timeout = setTimeout(
      () => pending.reject(new Error('Expected locking query was not attempted')),
      10_000,
    );
    const listener = (query: { sql: string; bindings?: unknown[] }) => {
      if (predicate(query)) {
        pending.resolve();
      }
    };
    db.on('query', listener);
    return pending.promise.finally(() => {
      clearTimeout(timeout);
      db.removeListener('query', listener);
    });
  }

  async function settleTransaction({
    transaction,
    pending,
  }: {
    transaction: Knex.Transaction;
    pending: Array<Promise<unknown> | undefined>;
  }) {
    if (!transaction.isCompleted()) {
      await transaction.rollback();
    }
    await Promise.all(pending);
  }

  it('clears shared inactive and archived triggers, preserves their graphs, and detaches only the deleted label', async function () {
    const before = await Promise.all([
      configure({ id: automationIds[0], status: 'inactive' }),
      configure({ id: automationIds[1], status: 'archived' }),
    ]);
    await agent.delete(`labels/${labelId}`).expectStatus(204);
    assert.equal(await db('labels').where('id', labelId).first(), undefined);
    assert.deepEqual(await db('members_labels').where('member_id', memberId).pluck('label_id'), [
      replacementId,
    ]);
    for (const original of before) {
      const saved = await read(original.id);
      assert.equal(saved.status, original.status);
      assert.deepEqual(saved.trigger_rules, [
        {
          trigger_type: 'label_added',
          label_id: null,
          scope: null,
          product_id: null,
          direction: null,
        },
      ]);
      assert.deepEqual(saved.actions, original.actions);
      assert.deepEqual(saved.edges, original.edges);
    }
  });

  it('rejects mixed active and inactive references without changing any labels, links, or triggers', async function () {
    await configure({ id: automationIds[0], status: 'active' });
    await configure({ id: automationIds[1], status: 'inactive' });
    const before = await state();
    const { body } = await agent.delete(`labels/${labelId}`).expectStatus(422);
    assert.equal(body.errors[0].code, 'LABEL_IN_ACTIVE_AUTOMATION');
    assert.deepEqual(await state(), before);
  });

  it('keeps other trigger types intact and requires a replacement before publishing', async function () {
    const original = await configure({ id: automationIds[0], status: 'inactive' });
    const unrelated = await read(automationIds[1]);
    await agent.delete(`labels/${labelId}`).expectStatus(204);
    const deleted = await read(original.id);
    await activation(deleted).expectStatus(422);
    await agent
      .put(`automations/${original.id}`)
      .body({ automations: [{ ...deleted, status: 'active' }] })
      .expectStatus(422);
    await agent
      .put(`automations/${original.id}`)
      .body({ automations: [{ ...original, status: 'active' }] })
      .expectStatus(422);
    assert.equal((await read(original.id)).status, 'inactive');
    const { body } = await agent
      .put(`automations/${original.id}`)
      .body({
        automations: [
          {
            ...deleted,
            status: 'active',
            trigger_rules: [
              {
                trigger_type: 'label_added',
                label_id: replacementId,
                scope: null,
                product_id: null,
                direction: null,
              },
            ],
          },
        ],
      })
      .expectStatus(200);
    assert.equal(body.automations[0].status, 'active');
    assert.equal(body.automations[0].trigger_rules[0].label_id, replacementId);
    assert.deepEqual(body.automations[0].actions, original.actions);
    assert.deepEqual(body.automations[0].edges, original.edges);
    assert.deepEqual(await read(unrelated.id), unrelated);
  });

  it('rolls back trigger cleanup and member detachment with the caller transaction', async function () {
    await configure({ id: automationIds[0], status: 'inactive' });
    const before = await state();
    await assert.rejects(
      models.Base.transaction(async (transacting: Knex.Transaction) => {
        await models.Label.destroy({ id: labelId, transacting, context: { internal: true } });
        throw new Error('Roll back deletion');
      }),
      /Roll back deletion/,
    );
    assert.deepEqual(await state(), before);
  });

  it('rejects activation waiting behind a permitted deletion, including when trigger rules were omitted', async function () {
    const original = await configure({ id: automationIds[0], status: 'inactive' });
    const deletion = await db.transaction();
    let publish: Promise<unknown> | undefined;
    try {
      await models.Label.destroy({
        id: labelId,
        transacting: deletion,
        context: { internal: true },
      });
      // Watch only the activation, after the deletion has acquired its lock.
      const waiting = queryAttempt(
        ({ sql, bindings }) =>
          sql.includes('from `settings`') &&
          sql.includes('for update') &&
          !!bindings?.includes('site_uuid'),
      );
      publish = Promise.resolve(activation(original).expectStatus(422));
      await waiting;
      await deletion.commit();
      await publish;
      const saved = await read(original.id);
      assert.equal(saved.status, 'inactive');
      assert.equal(saved.trigger_rules[0].trigger_type, 'label_added');
      assert.equal(await db('labels').where('id', labelId).first(), undefined);
    } finally {
      await settleTransaction({ transaction: deletion, pending: [publish] });
    }
  });

  it('rejects deletion waiting behind activation and preserves the label and member links', async function () {
    const original = await configure({ id: automationIds[0], status: 'inactive' });
    const before = await state();
    const blocker = await db.transaction();
    await blocker('labels').where('id', labelId).forUpdate().first();
    const labelAttempt = queryAttempt(
      ({ sql, bindings }) =>
        sql.includes('from `labels`') &&
        sql.includes('for update') &&
        !!bindings?.includes(labelId),
    );
    let publish: Promise<unknown> | undefined;
    let remove: Promise<unknown> | undefined;
    try {
      publish = Promise.resolve(activation(original).expectStatus(200));
      await labelAttempt;
      const automationLockAttempt = queryAttempt(
        ({ sql, bindings }) =>
          sql.includes('from `settings`') &&
          sql.includes('for update') &&
          !!bindings?.includes('site_uuid'),
      );
      remove = Promise.resolve(agent.delete(`labels/${labelId}`).expectStatus(422));
      await automationLockAttempt;
      await blocker.commit();
      await Promise.all([publish, remove]);
      assert.equal((await read(original.id)).status, 'active');
      // Activation replaced no rules, and rejection touched no label/member data.
      assert.deepEqual(await state(), before);
    } finally {
      await settleTransaction({ transaction: blocker, pending: [publish, remove] });
    }
  });
});
