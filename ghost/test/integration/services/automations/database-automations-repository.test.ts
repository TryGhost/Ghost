import { buildTriggerRuleRows } from '../../../../core/server/services/automations/trigger-rules';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
// @ts-expect-error Test utilities currently lack type definitions.
import testUtils from '../../../utils';
import { fromDatabaseDate, toDatabaseDate } from '../../../../core/server/lib/db-types/date';
import { createDatabaseAutomationsRepository } from '../../../../core/server/services/automations/database-automations-repository';
import { createDatabaseAutomationsRepository2 } from '../../../../core/server/services/automations/database-automations-repository-2';
import { createAutomationsApi2 } from '../../../../core/server/services/automations/automations-api-2';
import type { AutomationTriggerTierScope } from '../../../../core/server/services/automations/automations-repository-2';
import { MEMBER_WELCOME_EMAIL_SLUGS } from '../../../../core/server/services/member-welcome-emails/constants';
const dbUtils = require('../../../utils/db-utils');

describe('database automations repository', function () {
  const knex: Knex = testUtils.knex;
  const automationId = ObjectId().toHexString();

  const selectedTierIds = [ObjectId().toHexString(), ObjectId().toHexString()];

  const createApi = () =>
    createAutomationsApi2({
      repository: createDatabaseAutomationsRepository2({ knex }),
      fakeWaitHoursMultiplier: null,
      labs: { isSet: () => true },
      domainEvents: { dispatch: () => {} },
    });

  async function insertAutomation({
    id = ObjectId().toHexString(),
    slug = null,
    triggerTierScope = 'selected_paid',
    triggerTierIds = [],
  }: {
    id?: string;
    slug?: string | null;
    triggerTierScope?: AutomationTriggerTierScope;
    triggerTierIds?: string[];
  } = {}): Promise<string> {
    const actionId = ObjectId().toHexString();
    const now = toDatabaseDate(new Date());
    await knex('automations').insert({
      id,
      slug,
      name: `Test automation ${id}`,
      status: 'active',
      created_at: now,
      updated_at: now,
    });
    const rules = buildTriggerRuleRows({
      automationId: id,
      scope: triggerTierScope,
      tierIds: triggerTierIds,
      createdAt: fromDatabaseDate(now),
    });
    if (rules.length > 0) {
      await knex('automation_trigger_rules').insert(rules);
    }
    await knex('automation_actions').insert({
      id: actionId,
      automation_id: id,
      type: 'wait',
      created_at: now,
      updated_at: now,
    });
    await knex('automation_action_revisions').insert({
      id: ObjectId().toHexString(),
      action_id: actionId,
      wait_hours: 1,
      created_at: now,
    });
    return id;
  }

  beforeAll(async function () {
    // Files share a database within a worker; start from the default fixtures.
    await dbUtils.reset({ truncate: true });
    await testUtils.setup('default')();
    await insertAutomation({
      id: automationId,
      slug: MEMBER_WELCOME_EMAIL_SLUGS.free,
      triggerTierScope: 'free',
    });
    await knex('products').insert(
      selectedTierIds.map((id, index) => ({
        id,
        name: index === 0 ? 'Silver' : 'Gold',
        slug: id,
        type: 'paid',
        created_at: toDatabaseDate(new Date()),
      })),
    );
  });

  async function insertMember(memberId: string): Promise<string> {
    const memberEmail = `${memberId}@example.com`;
    const now = toDatabaseDate(new Date());
    await knex('members').insert({
      id: memberId,
      uuid: randomUUID(),
      transient_id: randomUUID(),
      email: memberEmail,
      status: 'free',
      created_at: now,
      updated_at: now,
    });
    return memberEmail;
  }

  describe('add', function () {
    it('saves a new active automation with actions and edges', async function () {
      const repo = createDatabaseAutomationsRepository({ knex, fakeWaitHoursMultiplier: null });
      const actions = [1, 2].map((wait_hours) => ({
        id: ObjectId().toHexString(),
        type: 'wait' as const,
        data: { wait_hours },
      }));
      const data = {
        status: 'active' as const,
        actions,
        edges: [{ source_action_id: actions[0].id, target_action_id: actions[1].id }],
        name: `Creation test ${ObjectId().toHexString()}`,
        description: 'Test description',
        trigger_tier_scope: 'free' as const,
        trigger_tier_ids: null,
      };
      const automation = await repo.add(data);

      try {
        assert(ObjectId.isValid(automation.id));
        assert.deepEqual(automation, {
          id: automation.id,
          slug: null,
          ...data,
          created_at: automation.created_at,
          updated_at: automation.updated_at,
        });
        assert.deepEqual(await repo.getById(automation.id), automation);
        const row = await knex('automations').where('id', automation.id).first();
        assert(row);
        assert(row.created_at);
        assert.deepEqual(row.updated_at, row.created_at);
      } finally {
        const actionIds = data.actions.map((action) => action.id);
        await knex('automation_action_edges').whereIn('source_action_id', actionIds).del();
        await knex('automation_action_revisions').whereIn('action_id', actionIds).del();
        await knex('automation_actions').whereIn('id', actionIds).del();
        await knex('automations').where('id', automation.id).del();
      }
    });
  });

  describe('trigger', function () {
    it('excludes paid members whose tier is not selected', async function () {
      const selectedAutomationId = await insertAutomation({ triggerTierIds: selectedTierIds });
      const api = createApi();
      const memberId = ObjectId().toHexString();
      await api.trigger({
        event: 'membership_started',
        memberId,
        memberEmail: await insertMember(memberId),
        memberStatus: 'paid',
        memberTierIds: [ObjectId().toHexString()],
      });
      const runs = await knex('automation_runs').where({
        automation_id: selectedAutomationId,
        member_id: memberId,
      });
      assert.equal(runs.length, 0);
    });

    it('creates one run and step when two distinct selected tiers match', async function () {
      const selectedAutomationId = await insertAutomation({ triggerTierIds: selectedTierIds });
      const api = createApi();
      const memberId = ObjectId().toHexString();
      await api.trigger({
        event: 'membership_started',
        memberId,
        memberEmail: await insertMember(memberId),
        memberStatus: 'paid',
        memberTierIds: selectedTierIds,
      });
      const runs = await knex('automation_runs').where({
        automation_id: selectedAutomationId,
        member_id: memberId,
      });
      assert.equal(runs.length, 1);
      const steps = await knex('automation_run_steps').where({ automation_run_id: runs[0]?.id });
      assert.equal(steps.length, 1);
    });

    it('only triggers automations once per automation+member, even with race conditions', async function () {
      const memberId = ObjectId().toHexString();
      const memberEmail = await insertMember(memberId);

      {
        // Lock a member.
        const memberLockTxn = await knex.transaction();
        await memberLockTxn('members').where('id', memberId).forUpdate().first('id');

        // Wait until both triggers try to lock the member.
        const bothMemberLocksRequested = Promise.withResolvers<void>();
        const timeout = setTimeout(
          () => bothMemberLocksRequested.reject(new Error('Triggers did not reach member lock')),
          10_000,
        );
        let memberLockCount = 0;
        const onKnexQuery = (query: { sql: string }) => {
          if (!query.sql.includes('from `members`') || !query.sql.includes('for update')) {
            return;
          }
          memberLockCount += 1;
          if (memberLockCount === 2) {
            bothMemberLocksRequested.resolve();
          }
        };
        knex.on('query', onKnexQuery);

        // Actually do the triggers.
        const api = createApi();
        const triggerOptions = {
          event: 'membership_started' as const,
          memberId,
          memberEmail,
          memberStatus: 'free' as const,
          memberTierIds: [],
        };
        const triggers = Promise.all([api.trigger(triggerOptions), api.trigger(triggerOptions)]);
        triggers.catch(bothMemberLocksRequested.reject);

        try {
          await bothMemberLocksRequested.promise;
        } finally {
          clearTimeout(timeout);
          knex.removeListener('query', onKnexQuery);
          await memberLockTxn.rollback();
          await triggers;
        }
      }

      const runs = await knex('automation_runs').where({
        automation_id: automationId,
        member_id: memberId,
      });
      assert.equal(runs.length, 1);
      const steps = await knex('automation_run_steps').where('automation_run_id', runs[0].id);
      assert.equal(steps.length, 1);
    });

    it('enrolls different members concurrently without deadlocking', async function () {
      const memberIds = [ObjectId().toHexString(), ObjectId().toHexString()];
      const memberEmails = await Promise.all(memberIds.map(insertMember));
      const api = createApi();

      // Hold the referenced automation row so both triggers reach the run lookup
      // before either can insert its run.
      const automationLockTxn = await knex.transaction();
      await automationLockTxn('automations').where('id', automationId).forUpdate().first('id');

      const bothRunLookupsFinished = Promise.withResolvers<void>();
      const timeout = setTimeout(
        () => bothRunLookupsFinished.reject(new Error('Triggers did not reach run lookup')),
        10_000,
      );
      let runLookupCount = 0;
      const onKnexQueryResponse = (_response: unknown, query: { sql: string }) => {
        if (!query.sql.includes('from `automation_runs`')) {
          return;
        }
        runLookupCount += 1;
        if (runLookupCount === 2) {
          bothRunLookupsFinished.resolve();
        }
      };
      knex.on('query-response', onKnexQueryResponse);

      const triggers = memberIds.map((memberId, index) =>
        api.trigger({
          event: 'membership_started',
          memberId,
          memberEmail: memberEmails[index],
          memberStatus: 'free',
          memberTierIds: [],
        }),
      );
      const triggerResults = Promise.allSettled(triggers);

      try {
        await bothRunLookupsFinished.promise;
      } finally {
        clearTimeout(timeout);
        knex.removeListener('query-response', onKnexQueryResponse);
        await automationLockTxn.rollback();
        await triggerResults;
      }

      for (const result of await triggerResults) {
        if (result.status === 'rejected') {
          throw result.reason;
        }
      }

      const runs = await knex('automation_runs')
        .where('automation_id', automationId)
        .whereIn('member_id', memberIds);
      assert.equal(runs.length, 2);
    });
  });

  describe('fetchAndLockSteps', function () {
    it("returns each step once with the automation's current selected tiers", async function () {
      const selectedAutomationId = await insertAutomation({ triggerTierIds: selectedTierIds });
      const repo = createDatabaseAutomationsRepository({ knex, fakeWaitHoursMultiplier: null });
      const api = createApi();
      for (const memberId of [ObjectId().toHexString(), ObjectId().toHexString()]) {
        await api.trigger({
          event: 'membership_started',
          memberId,
          memberEmail: await insertMember(memberId),
          memberStatus: 'paid',
          memberTierIds: selectedTierIds,
        });
      }
      const runs = await knex('automation_runs').where({ automation_id: selectedAutomationId });
      assert.equal(runs.length, 2);
      await knex('automation_run_steps')
        .whereIn(
          'automation_run_id',
          runs.map((run) => run.id),
        )
        .update({ ready_at: toDatabaseDate(new Date('2024-01-01')) });

      const first = await repo.fetchAndLockSteps(1);
      assert.equal(first.steps.length, 1);
      assert.deepEqual(
        [...first.steps[0].automation_trigger_rules.map((rule) => rule.product_id)].sort(),
        [...selectedTierIds].sort(),
      );

      await repo.finishStepAndEnqueueNext(first.steps[0]);
      await knex('automation_trigger_rules')
        .where({ automation_id: selectedAutomationId, product_id: selectedTierIds[0] })
        .delete();
      const second = await repo.fetchAndLockSteps(1);
      assert.equal(second.steps.length, 1);
      assert.notEqual(second.steps[0].id, first.steps[0].id);
      assert.deepEqual(
        second.steps[0].automation_trigger_rules.map((rule) => rule.product_id),
        [selectedTierIds[1]],
      );
    });
  });
});
