import { buildTriggerRuleRows } from '../../../../core/server/services/automations/trigger-rules';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { onTestFinished, vi } from 'vitest';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
// @ts-expect-error Test utilities currently lack type definitions.
import testUtils from '../../../utils';
import { mockSystemTime } from '../../../utils/clock-utils';
import { fromDatabaseDate, toDatabaseDate } from '../../../../core/server/lib/db-types/date';
import { createDatabaseAutomationsRepository } from '../../../../core/server/services/automations/database-automations-repository';
import { createDatabaseAutomationsRepository2 } from '../../../../core/server/services/automations/database-automations-repository-2';
import { createAutomationsApi2 } from '../../../../core/server/services/automations/automations-api-2';
import { MAX_STEPS_PER_BATCH } from '../../../../core/server/services/automations/constants';
import { poll } from '../../../../core/server/services/automations/poll';
import type { AutomationTriggerTierScope } from '../../../../core/server/services/automations/automations-repository-2';
import { MEMBER_WELCOME_EMAIL_SLUGS } from '../../../../core/server/services/member-welcome-emails/constants';
const dbUtils = require('../../../utils/db-utils');
const { Member } = require('../../../../core/server/models');
const MemberRepository = require('../../../../core/server/services/members/members-api/repositories/member-repository');

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

  async function insertMember(memberId: string, status = 'free'): Promise<string> {
    const memberEmail = `${memberId}@example.com`;
    const now = toDatabaseDate(new Date());
    await knex('members').insert({
      id: memberId,
      uuid: randomUUID(),
      transient_id: randomUUID(),
      email: memberEmail,
      status,
      enable_updates_and_announcements: true,
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
        trigger_rules: [
          { trigger_type: 'free_signup' as const, scope: null, product_id: null, direction: null },
        ],
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

  describe('notify', function () {
    it('excludes paid members whose tier is not selected', async function () {
      const selectedAutomationId = await insertAutomation({ triggerTierIds: selectedTierIds });
      const api = createApi();
      const memberId = ObjectId().toHexString();
      await api.notify({
        eventName: 'membership_started',
        priority: 'low',
        source: 'member' as const,
        memberId,
        memberEmail: await insertMember(memberId),
        memberStatus: 'paid',
        previousMemberStatus: null,
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
      await api.notify({
        eventName: 'membership_started',
        priority: 'low',
        source: 'member' as const,
        memberId,
        memberEmail: await insertMember(memberId),
        memberStatus: 'paid',
        previousMemberStatus: null,
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

        // Wait until both notifications try to lock the member.
        const bothMemberLocksRequested = Promise.withResolvers<void>();
        const timeout = setTimeout(
          () =>
            bothMemberLocksRequested.reject(new Error('Notifications did not reach member lock')),
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

        // Notify the automations system twice.
        const api = createApi();
        const event = {
          eventName: 'membership_started' as const,
          priority: 'low' as const,
          source: 'member' as const,
          memberId,
          memberEmail,
          memberStatus: 'free' as const,
          previousMemberStatus: null,
          memberTierIds: [],
        };
        const notifications = Promise.all([api.notify(event), api.notify(event)]);
        notifications.catch(bothMemberLocksRequested.reject);

        try {
          await bothMemberLocksRequested.promise;
        } finally {
          clearTimeout(timeout);
          knex.removeListener('query', onKnexQuery);
          await memberLockTxn.rollback();
          await notifications;
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
      const memberEmails = await Promise.all(memberIds.map((id) => insertMember(id)));
      const api = createApi();

      // Hold the referenced automation row so both notifications reach the run lookup
      // before either can insert its run.
      const automationLockTxn = await knex.transaction();
      await automationLockTxn('automations').where('id', automationId).forUpdate().first('id');

      const bothRunLookupsFinished = Promise.withResolvers<void>();
      const timeout = setTimeout(
        () => bothRunLookupsFinished.reject(new Error('Notifications did not reach run lookup')),
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

      const notifications = memberIds.map((memberId, index) =>
        api.notify({
          eventName: 'membership_started',
          priority: 'low',
          source: 'member' as const,
          memberId,
          memberEmail: memberEmails[index],
          memberStatus: 'free',
          previousMemberStatus: null,
          memberTierIds: [],
        }),
      );
      const notificationResults = Promise.allSettled(notifications);

      try {
        await bothRunLookupsFinished.promise;
      } finally {
        clearTimeout(timeout);
        knex.removeListener('query-response', onKnexQueryResponse);
        await automationLockTxn.rollback();
        await notificationResults;
      }

      for (const result of await notificationResults) {
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
        await api.notify({
          eventName: 'membership_started',
          priority: 'low',
          source: 'member' as const,
          memberId,
          memberEmail: await insertMember(memberId),
          memberStatus: 'paid',
          previousMemberStatus: null,
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

    it('sends a paid-start email in the next batch while older free-signup steps are still queued', async function () {
      // Use a whole second so MySQL stores the immediate step as ready on this poll.
      const clock = mockSystemTime(Math.floor(Date.now() / 1000) * 1000);
      onTestFinished(() => clock.restore());
      const members = new MemberRepository({ automationsApi: createApi() });
      const repository = createDatabaseAutomationsRepository({
        knex,
        fakeWaitHoursMultiplier: null,
      });
      const freeAutomationId = await insertAutomation({ triggerTierScope: 'free' });
      const paidAutomationId = await insertAutomation({ triggerTierScope: 'all_paid' });
      const paidAction = await knex('automation_actions')
        .where('automation_id', paidAutomationId)
        .first();
      await knex('automation_actions').where('id', paidAction.id).update({ type: 'send_email' });
      await knex('automation_action_revisions').where('action_id', paidAction.id).update({
        wait_hours: null,
        email_subject: 'Welcome to paid membership',
        email_lexical: '{}',
      });

      async function startMembership(memberStatus: 'free' | 'paid') {
        const memberId = ObjectId().toHexString();
        const email = await insertMember(memberId, memberStatus);
        const member = await Member.findOne({ id: memberId });
        assert(member);
        await members.notifyMembershipStartedAutomation({
          member,
          memberStatus,
          bookshelfOptions: {},
        });
        return email;
      }

      // Even after two full batches there must be free-signup work left.
      const backlogSize = 2 * MAX_STEPS_PER_BATCH + 1;
      for (let index = 0; index < backlogSize; index++) {
        await startMembership('free');
      }
      const freeRunIds: string[] = await knex('automation_runs')
        .where('automation_id', freeAutomationId)
        .pluck('id');
      assert.equal(freeRunIds.length, backlogSize);
      const readyAt = toDatabaseDate(new Date('2000-01-01'));
      await knex('automation_run_steps')
        .whereIn('automation_run_id', freeRunIds)
        .update({ ready_at: readyAt });

      const batchClaimed = Promise.withResolvers<void>();
      const releaseBatch = Promise.withResolvers<void>();
      const fetchAndLockSteps = vi
        .fn(repository.fetchAndLockSteps)
        .mockImplementationOnce(async (limit) => {
          const batch = await repository.fetchAndLockSteps(limit);
          assert.equal(batch.steps.length, MAX_STEPS_PER_BATCH);
          assert(batch.steps.every((step) => step.automation_id === freeAutomationId));
          batchClaimed.resolve();
          await releaseBatch.promise;
          return batch;
        });
      const sendAutomationEmail = vi.fn(async () => undefined);
      const pollOptions = {
        automationsApi: { ...repository, fetchAndLockSteps },
        enqueueAnotherPollAt: vi.fn(),
        scheduleAutomationEmailAnalyticsJob: vi.fn(),
        memberWelcomeEmailService: { sendAutomationEmail },
      };
      const firstPoll = poll(pollOptions);
      let paidEmail: string;
      try {
        await Promise.race([batchClaimed.promise, firstPoll]);
        paidEmail = await startMembership('paid');
      } finally {
        releaseBatch.resolve();
        await firstPoll;
      }

      expect(sendAutomationEmail).not.toHaveBeenCalled();
      const paidRun = await knex('automation_runs')
        .where({ automation_id: paidAutomationId, member_email: paidEmail })
        .first();
      assert(paidRun, 'Expected the paid membership start to enroll');
      await poll(pollOptions);
      const paidStep = await knex('automation_run_steps')
        .where('automation_run_id', paidRun.id)
        .first();
      assert.equal(
        paidStep.status,
        'finished',
        'Expected the paid step to finish in the next batch',
      );
      expect(sendAutomationEmail).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ member: expect.objectContaining({ email: paidEmail }) }),
      );
      const pendingFreeSteps = await knex('automation_run_steps')
        .whereIn('automation_run_id', freeRunIds)
        .where('status', 'pending');
      assert.equal(pendingFreeSteps.length, backlogSize - 2 * MAX_STEPS_PER_BATCH + 1);
    });
  });
});
