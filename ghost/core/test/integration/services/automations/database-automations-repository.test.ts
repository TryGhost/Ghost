import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
// @ts-expect-error Test utilities currently lack type definitions.
import testUtils from '../../../utils';
import { toDatabaseDate } from '../../../../core/server/lib/db-types/date';
import { createDatabaseAutomationsRepository } from '../../../../core/server/services/automations/database-automations-repository';
import { MEMBER_WELCOME_EMAIL_SLUGS } from '../../../../core/server/services/member-welcome-emails/constants';

describe('database automations repository', function () {
  const knex: Knex = testUtils.knex;
  const automationId = ObjectId().toHexString();

  beforeAll(async function () {
    await testUtils.setup('default')();
    const actionId = ObjectId().toHexString();
    const now = toDatabaseDate(new Date());

    await knex('automations').insert({
      id: automationId,
      slug: MEMBER_WELCOME_EMAIL_SLUGS.free,
      name: 'Free welcome automation',
      status: 'active',
      trigger_tier_scope: 'free',
      created_at: now,
      updated_at: now,
    });
    await knex('automation_actions').insert({
      id: actionId,
      automation_id: automationId,
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

  describe('trigger', function () {
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
        const repo = createDatabaseAutomationsRepository({
          knex,
          fakeWaitHoursMultiplier: null,
        });
        const triggerOptions = { memberId, memberEmail, memberStatus: 'free' as const };
        const triggers = Promise.all([repo.trigger(triggerOptions), repo.trigger(triggerOptions)]);
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
      const repo = createDatabaseAutomationsRepository({
        knex,
        fakeWaitHoursMultiplier: null,
      });

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
        repo.trigger({
          memberId,
          memberEmail: memberEmails[index],
          memberStatus: 'free',
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
});
