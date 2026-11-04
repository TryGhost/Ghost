import { buildTriggerRuleRows } from '../../../../core/server/services/automations/trigger-rules';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { randomUUID } from 'node:crypto';
import { onTestFinished } from 'vitest';
import { fromDatabaseDate } from '../../../../core/server/lib/db-types/date';
import type {
  ActionToInsert,
  EdgeRow,
  RunStepToInsert,
} from '../../../../core/server/services/automations/automations-repository-2';
import { createDatabaseAutomationsRepository2 } from '../../../../core/server/services/automations/database-automations-repository-2';
// @ts-expect-error This module lacks type definitions.
import testUtils from '../../../utils';
import { alphabeticalDescribe } from '../../../utils/alphabetical-describe';
// @ts-expect-error This module lacks type definitions.
import * as dbUtils from '../../../utils/db-utils';

describe('database automations repository', function () {
  const knex: Knex = testUtils.knex;

  const createdAt = new Date('2026-01-02T03:04:05Z');
  const updatedAt = new Date('2026-01-03T04:05:06Z');
  const readyAt = new Date('2026-01-04T05:06:07Z');
  const now = createdAt;
  const later = updatedAt;

  const createAutomation = (id = ObjectId().toHexString()) => ({
    id,
    name: `Test automation ${id}`,
    status: 'active',
    created_at: now,
  });

  const createMember = (id: string) => ({
    id,
    uuid: randomUUID(),
    transient_id: randomUUID(),
    email: `${id}@example.com`,
    status: 'free',
    created_at: now,
    updated_at: now,
  });

  const createAction = (automationId: string) => ({
    id: ObjectId().toHexString(),
    automation_id: automationId,
    type: 'wait',
    created_at: now,
    updated_at: now,
    deleted_at: null as string | null,
  });

  const createRevision = (actionId: string) => ({
    id: ObjectId().toHexString(),
    action_id: actionId,
    created_at: now,
    wait_hours: 1 as number | null,
  });

  const createRun = (automationId: string, memberId: string) => ({
    id: ObjectId().toHexString(),
    automation_id: automationId,
    member_id: memberId,
    member_email: `${memberId}@example.com`,
    created_at: now,
    updated_at: later,
  });

  const createRunStep = (runId: string, revisionId: string): RunStepToInsert => ({
    id: ObjectId().toHexString(),
    automation_run_id: runId,
    automation_action_revision_id: revisionId,
    created_at: createdAt,
    updated_at: updatedAt,
    ready_at: readyAt,
  });

  const useEmailClickFixture = () => {
    const repository = createDatabaseAutomationsRepository2({ knex });
    let automationId: string;
    let actionId: string;
    let memberId: string;
    let runId: string;
    let revisionIds: string[];
    let stepId: string;
    let recipientId: string;

    beforeEach(async function () {
      const automation = createAutomation();
      const action = createAction(automation.id);
      const member = createMember(ObjectId().toHexString());
      const run = createRun(automation.id, member.id);
      const revisions = [createRevision(action.id), createRevision(action.id)];
      revisions[1].created_at = later;
      const step = createRunStep(run.id, revisions[0].id);
      automationId = automation.id;
      actionId = action.id;
      memberId = member.id;
      runId = run.id;
      revisionIds = revisions.map((revision) => revision.id);
      stepId = step.id;
      recipientId = ObjectId().toHexString();
      await knex('automations').insert(automation);
      await knex('members').insert(member);
      await knex('automation_actions').insert(action);
      await knex('automation_action_revisions').insert(revisions);
      await knex('automation_runs').insert(run);
      await knex('automation_run_steps').insert(step);
      await knex('automated_email_recipients').insert({
        id: recipientId,
        automation_action_revision_id: revisionIds[0],
        automation_run_step_id: stepId,
        member_id: memberId,
        member_uuid: member.uuid,
        member_email: member.email,
        track_clicks: true,
        created_at: now,
      });
    });

    afterEach(async function () {
      await knex('automated_email_recipients')
        .whereIn('automation_action_revision_id', revisionIds)
        .delete();
      await knex('automation_run_steps').where('id', stepId).delete();
      await knex('automation_runs').where('id', runId).delete();
      await knex('automation_action_revisions').whereIn('id', revisionIds).delete();
      await knex('automation_actions').where('id', actionId).delete();
      await knex('automations').where('id', automationId).delete();
      await knex('members').where('id', memberId).delete();
    });

    const findEmailRecipientForClick = (connection: Knex | Knex.Transaction = knex) =>
      repository.findEmailRecipientForClick(connection, {
        automationActionRevisionId: revisionIds[0],
        automationRunStepId: stepId,
        memberId,
      });

    return {
      repository,
      findEmailRecipientForClick,
      get memberId() {
        return memberId;
      },
      get revisionIds() {
        return revisionIds;
      },
      get stepId() {
        return stepId;
      },
      get recipientId() {
        return recipientId;
      },
    };
  };

  const useEmailTrackingFixture = () => {
    const fixture = useEmailClickFixture();
    const ids: Record<string, string> = {};
    const earlier = new Date('2026-01-01T00:00:00Z');
    const laterEvent = new Date('2026-02-01T00:00:00Z');

    const getRecipient = async (id: string) => {
      const row = await knex('automated_email_recipients').where({ id }).first();
      return {
        deliveredAt: row.delivered_at === null ? null : fromDatabaseDate(row.delivered_at),
        openedAt: row.opened_at === null ? null : fromDatabaseDate(row.opened_at),
      };
    };

    beforeEach(async function () {
      ids.unopened = fixture.recipientId;
      ids.opened = ObjectId().toHexString();
      ids.other = ObjectId().toHexString();
      ids.missing = ObjectId().toHexString();
      const recipient = await knex('automated_email_recipients')
        .where('id', fixture.recipientId)
        .first();
      await knex('automated_email_recipients').insert([
        { ...recipient, id: ids.opened, delivered_at: earlier, opened_at: earlier },
        { ...recipient, id: ids.other },
      ]);
      await knex('automation_action_revisions')
        .where('id', fixture.revisionIds[1])
        .update({ email_opened_count: 5 });
    });

    return { repository: fixture.repository, fixture, ids, earlier, laterEvent, getRecipient };
  };

  beforeAll(async function () {
    await dbUtils.reset({ truncate: true });
    await testUtils.setup('default')();
  });

  describe('alphabetical key order', function () {
    it('keeps its keys in alphabetical order for consistency', function () {
      const repository = createDatabaseAutomationsRepository2({ knex });

      const actual = Object.keys(repository);
      const expected = actual.toSorted();

      expect(actual).toEqual(expected);
    });
  });

  alphabeticalDescribe('findEmailRecipientForClick', function () {
    const fixture = useEmailClickFixture();
    const { repository, findEmailRecipientForClick } = fixture;

    it('returns the matching recipient with null or parsed click timestamp', async function () {
      expect(await findEmailRecipientForClick()).toEqual({
        id: fixture.recipientId,
        clicked_at: null,
      });

      await knex('automated_email_recipients')
        .where('id', fixture.recipientId)
        .update({ clicked_at: now });

      expect(await findEmailRecipientForClick()).toEqual({
        id: fixture.recipientId,
        clicked_at: now,
      });
    });

    it.each(['automationActionRevisionId', 'automationRunStepId', 'memberId'] as const)(
      'does not match a different %s',
      async function (field) {
        expect(
          await repository.findEmailRecipientForClick(knex, {
            automationActionRevisionId: fixture.revisionIds[0],
            automationRunStepId: fixture.stepId,
            memberId: fixture.memberId,
            [field]: ObjectId().toHexString(),
          }),
        ).toBeUndefined();
      },
    );

    it('does not return recipients with tracking disabled', async function () {
      await knex('automated_email_recipients')
        .where('id', fixture.recipientId)
        .update('track_clicks', false);

      expect(await findEmailRecipientForClick()).toBeUndefined();
    });

    it('locks the recipient until transaction completion', async function () {
      const trx = await knex.transaction();

      try {
        await findEmailRecipientForClick(trx);
        await repository.withTransaction(async (otherTrx) => {
          await expect(
            otherTrx('automated_email_recipients')
              .where('id', fixture.recipientId)
              .forUpdate()
              .noWait()
              .first(),
          ).rejects.toMatchObject({ code: 'ER_LOCK_NOWAIT' });
        });
      } finally {
        await trx.rollback();
      }
    });
  });

  alphabeticalDescribe('findFirstActionRevisions', function () {
    let repository: ReturnType<typeof createDatabaseAutomationsRepository2>;
    let automationIds: string[];
    let actionIds: string[];
    let tierIds: string[];

    const insertAction = async (
      automationId: string,
      actionOverrides: Partial<ReturnType<typeof createAction>> = {},
      revisionOverrides: Partial<ReturnType<typeof createRevision>> = {},
    ) => {
      const action = { ...createAction(automationId), ...actionOverrides };
      const revision = { ...createRevision(action.id), ...revisionOverrides };
      actionIds.push(action.id);
      await knex('automation_actions').insert(action);
      await knex('automation_action_revisions').insert(revision);
      return {
        automation_id: automationId,
        action_id: action.id,
        automation_action_revision_id: revision.id,
        type: action.type,
        wait_hours: revision.wait_hours,
      };
    };

    const insertAutomation = async (
      overrides: Partial<ReturnType<typeof createAutomation>> & {
        triggerScope?: 'free' | 'all_paid' | 'selected_paid';
      } = {},
    ) => {
      const { triggerScope = 'free', ...automationOverrides } = overrides;
      const automation = { ...createAutomation(), ...automationOverrides };
      automationIds.push(automation.id);
      await knex('automations').insert(automation);
      const rules = buildTriggerRuleRows({
        automationId: automation.id,
        scope: triggerScope,
        tierIds: [],
        createdAt: now,
      });
      if (rules.length > 0) {
        await knex('automation_trigger_rules').insert(rules);
      }
      return await insertAction(automation.id);
    };

    const insertTier = async () => {
      const id = ObjectId().toHexString();
      tierIds.push(id);
      await knex('products').insert({
        id,
        name: `Test tier ${id}`,
        slug: id,
        type: 'paid',
        created_at: now,
      });
      return id;
    };

    const insertAutomationTriggerTiers = async (automationId: string, productIds: string[]) => {
      await knex('automation_trigger_rules').insert(
        buildTriggerRuleRows({
          automationId,
          scope: 'selected_paid',
          tierIds: productIds,
          createdAt: now,
        }),
      );
    };

    const findFirstActionRevisions = (memberStatus: 'free' | 'paid', memberTierIds: string[]) =>
      repository.withConnection((connection) =>
        repository.findFirstActionRevisions(connection, {
          eventName: 'membership_started',
          memberStatus,
          memberTierIds,
        }),
      );

    it('finds automations when members leave a selected tier and join another or become free', async function () {
      const basic = await insertTier();
      const premium = await insertTier();
      const first = await insertAutomation({ triggerScope: 'selected_paid' });
      const rule = (direction: string, scope: string, productId: string | null) => ({
        id: ObjectId().toHexString(),
        automation_id: first.automation_id,
        created_at: now,
        trigger_type: 'paid_subscription_changed',
        direction,
        scope,
        product_id: productId,
      });
      await knex('automation_trigger_rules').insert([
        rule('from', 'specific_paid_tier', basic),
        rule('to', 'specific_paid_tier', premium),
      ]);
      const find = (status: 'free' | 'paid', before: string[], after: string[]) =>
        repository.withConnection((connection) =>
          repository.findFirstActionRevisions(connection, {
            eventName: 'paid_subscription_changed',
            memberStatus: status,
            memberTierIds: after,
            previousMemberTierIds: before,
          }),
        );
      expect(await find('paid', [basic], [premium])).toEqual([first]);
      expect(await find('paid', [basic, premium], [premium])).toEqual([]);
      expect(await find('paid', [basic], [basic])).toEqual([]);
      await knex('automation_trigger_rules')
        .where({ automation_id: first.automation_id, direction: 'to' })
        .update({ scope: 'free', product_id: null });
      expect(await find('free', [basic], [])).toEqual([first]);
      expect(await find('paid', [basic, premium], [premium])).toEqual([]);
      await knex('automations').where('id', first.automation_id).update({ status: 'inactive' });
      expect(await find('free', [basic], [])).toEqual([]);
    });

    it('does not start Any paid tier automations when members switch between selected To tiers', async function () {
      const silver = await insertTier();
      const gold = await insertTier();
      const platinum = await insertTier();
      const first = await insertAutomation({ triggerScope: 'selected_paid' });
      await knex('automation_trigger_rules').insert(
        [
          { direction: 'from', scope: 'any_paid_tier', product_id: null },
          { direction: 'to', scope: 'specific_paid_tier', product_id: gold },
          { direction: 'to', scope: 'specific_paid_tier', product_id: platinum },
        ].map((rule) => ({
          ...rule,
          id: ObjectId().toHexString(),
          automation_id: first.automation_id,
          created_at: now,
          trigger_type: 'paid_subscription_changed',
        })),
      );
      const find = (before: string[], after: string[]) =>
        repository.withConnection((connection) =>
          repository.findFirstActionRevisions(connection, {
            eventName: 'paid_subscription_changed',
            memberStatus: 'paid',
            memberTierIds: after,
            previousMemberTierIds: before,
          }),
        );
      expect(await find([], [gold])).toEqual([]);
      expect(await find([gold], [platinum])).toEqual([]);
      expect(await find([platinum], [gold])).toEqual([]);
      expect(await find([silver, gold], [platinum])).toEqual([]);
      expect(await find([silver], [gold])).toEqual([first]);
      expect(await find([silver], [platinum])).toEqual([first]);
    });

    beforeEach(function () {
      repository = createDatabaseAutomationsRepository2({ knex });
      automationIds = [];
      actionIds = [];
      tierIds = [];
    });

    afterEach(async function () {
      await knex('automation_action_edges').whereIn('source_action_id', actionIds).delete();
      await knex('automation_action_revisions').whereIn('action_id', actionIds).delete();
      await knex('automation_actions').whereIn('id', actionIds).delete();
      await knex('automations').whereIn('id', automationIds).delete();
      await knex('products').whereIn('id', tierIds).delete();
    });

    it('uses current trigger rules for matching', async function () {
      const first = await insertAutomation();
      await knex('automation_trigger_rules')
        .where('automation_id', first.automation_id)
        .update({ trigger_type: 'paid_subscription_started', scope: 'any_paid_tier' });
      assert.deepEqual(await findFirstActionRevisions('free', []), []);
      assert.deepEqual(await findFirstActionRevisions('paid', []), [first]);
    });

    it('returns an empty array when there are no automations', async function () {
      await expect(findFirstActionRevisions('free', [])).resolves.toEqual([]);
    });

    it('rejects unknown action types from the database', async function () {
      const action = await insertAutomation();
      await knex('automation_actions').where('id', action.action_id).update({ type: 'unknown' });

      await expect(findFirstActionRevisions('free', [])).rejects.toThrow();
    });

    it('rejects wait actions without wait hours', async function () {
      const action = await insertAutomation();
      await knex('automation_action_revisions')
        .where('id', action.automation_action_revision_id)
        .update({ wait_hours: null });

      await expect(findFirstActionRevisions('free', [])).rejects.toThrow();
    });

    it('rejects email actions with wait hours', async function () {
      const action = await insertAutomation();
      await knex('automation_actions').where('id', action.action_id).update({ type: 'send_email' });

      await expect(findFirstActionRevisions('free', [])).rejects.toThrow();
    });

    it('returns only free automations for free members, even with tier IDs', async function () {
      const free = await insertAutomation();
      await insertAutomation({ triggerScope: 'all_paid' });
      const selected = await insertAutomation({ triggerScope: 'selected_paid' });
      const tierId = await insertTier();
      await insertAutomationTriggerTiers(selected.automation_id, [tierId]);

      await expect(findFirstActionRevisions('free', [tierId])).resolves.toEqual([free]);
    });

    it('returns only all-paid automations for paid members without tier IDs', async function () {
      await insertAutomation();
      const paid = await insertAutomation({ triggerScope: 'all_paid' });
      await insertAutomation({ triggerScope: 'selected_paid' });

      await expect(findFirstActionRevisions('paid', [])).resolves.toEqual([paid]);
    });

    it('returns matching selected-tier and all-paid automations without duplicates', async function () {
      await insertAutomation();
      const paid = await insertAutomation({ triggerScope: 'all_paid' });
      const selected = await insertAutomation({ triggerScope: 'selected_paid' });
      const unmatched = await insertAutomation({ triggerScope: 'selected_paid' });
      await insertAutomation({ triggerScope: 'selected_paid' });
      const firstTierId = await insertTier();
      const secondTierId = await insertTier();
      const otherTierId = await insertTier();
      await insertAutomationTriggerTiers(selected.automation_id, [firstTierId, secondTierId]);
      await insertAutomationTriggerTiers(unmatched.automation_id, [otherTierId]);

      await expect(findFirstActionRevisions('paid', [firstTierId, secondTierId])).resolves.toEqual([
        paid,
        selected,
      ]);
    });

    it.each(['inactive', 'archived'])(
      'excludes %s automations for every tier scope',
      async function (status) {
        const free = await insertAutomation();
        const paid = await insertAutomation({ triggerScope: 'all_paid' });
        await insertAutomation({ status });
        await insertAutomation({ status, triggerScope: 'all_paid' });
        const selected = await insertAutomation({ status, triggerScope: 'selected_paid' });
        const tierId = await insertTier();
        await insertAutomationTriggerTiers(selected.automation_id, [tierId]);

        await expect(findFirstActionRevisions('free', [])).resolves.toEqual([free]);
        await expect(findFirstActionRevisions('paid', [tierId])).resolves.toEqual([paid]);
      },
    );

    it('returns first actions and excludes actions with active predecessors', async function () {
      const first = await insertAutomation();
      const next = await insertAction(first.automation_id);
      await knex('automation_action_edges').insert({
        source_action_id: first.action_id,
        target_action_id: next.action_id,
      });

      await expect(findFirstActionRevisions('free', [])).resolves.toEqual([first]);
    });

    it('excludes deleted actions and treats their successors as first actions', async function () {
      const deleted = await insertAutomation();
      await knex('automation_actions').where('id', deleted.action_id).update({ deleted_at: later });
      const next = await insertAction(deleted.automation_id);
      await knex('automation_action_edges').insert({
        source_action_id: deleted.action_id,
        target_action_id: next.action_id,
      });

      await expect(findFirstActionRevisions('free', [])).resolves.toEqual([next]);
    });

    it('excludes automations without actions', async function () {
      const automation = createAutomation();
      automationIds.push(automation.id);
      await knex('automations').insert(automation);

      await expect(findFirstActionRevisions('free', [])).resolves.toEqual([]);
    });

    it('excludes actions without revisions', async function () {
      const automation = createAutomation();
      automationIds.push(automation.id);
      await knex('automations').insert(automation);
      const action = createAction(automation.id);
      actionIds.push(action.id);
      await knex('automation_actions').insert(action);

      await expect(findFirstActionRevisions('free', [])).resolves.toEqual([]);
    });

    it('returns the latest revision of each first action', async function () {
      const first = await insertAutomation();
      const latest = { ...createRevision(first.action_id), created_at: later, wait_hours: 24 };
      await knex('automation_action_revisions').insert(latest);
      const email = await insertAction(
        first.automation_id,
        { type: 'send_email' },
        { wait_hours: null },
      );

      await expect(findFirstActionRevisions('free', [])).resolves.toEqual([
        { ...first, automation_action_revision_id: latest.id, wait_hours: 24 },
        email,
      ]);
    });

    it('orders first actions by creation time, then ID for ties', async function () {
      const laterAction = await insertAutomation();
      await knex('automation_actions')
        .where('id', laterAction.action_id)
        .update({ created_at: later });
      const higherId = await insertAction(laterAction.automation_id, {
        id: 'ffffffffffffffffffffffff',
      });
      const lowerId = await insertAction(laterAction.automation_id, {
        id: '000000000000000000000001',
      });

      await expect(findFirstActionRevisions('free', [])).resolves.toEqual([
        lowerId,
        higherId,
        laterAction,
      ]);
    });
  });

  alphabeticalDescribe('getNumberOfAutomations', function () {
    it('returns the number of automations', async function () {
      const repository = createDatabaseAutomationsRepository2({ knex });

      const result = await repository.withConnection((connection) =>
        repository.getNumberOfAutomations(connection),
      );

      expect(result).toBe(0);
    });
  });

  alphabeticalDescribe('hasMemberEnteredAutomation', function () {
    let repository: ReturnType<typeof createDatabaseAutomationsRepository2>;
    let automationId: string;
    let otherAutomationId: string;
    let memberId: string;
    let otherMemberId: string;

    const hasMemberEnteredAutomation = () =>
      repository.withConnection((connection) =>
        repository.hasMemberEnteredAutomation(connection, automationId, memberId),
      );

    beforeEach(async function () {
      repository = createDatabaseAutomationsRepository2({ knex });
      automationId = ObjectId().toHexString();
      otherAutomationId = ObjectId().toHexString();
      memberId = ObjectId().toHexString();
      otherMemberId = ObjectId().toHexString();
      await knex('automations').insert(createAutomation(automationId));
      await knex('members').insert(createMember(memberId));
    });

    afterEach(async function () {
      await knex('automation_runs')
        .whereIn('automation_id', [automationId, otherAutomationId])
        .delete();
      await knex('automations').whereIn('id', [automationId, otherAutomationId]).delete();
      await knex('members').whereIn('id', [memberId, otherMemberId]).delete();
    });

    it('returns false when the member has not entered any automation', async function () {
      await expect(hasMemberEnteredAutomation()).resolves.toBe(false);
    });

    it('returns true when the member has entered the automation', async function () {
      await knex('automation_runs').insert(createRun(automationId, memberId));
      await expect(hasMemberEnteredAutomation()).resolves.toBe(true);
    });

    it('returns false when only another member has entered the automation', async function () {
      await knex('members').insert(createMember(otherMemberId));
      await knex('automation_runs').insert(createRun(automationId, otherMemberId));
      await expect(hasMemberEnteredAutomation()).resolves.toBe(false);
    });

    it('returns false when the member has only entered another automation', async function () {
      await knex('automations').insert(createAutomation(otherAutomationId));
      await knex('automation_runs').insert(createRun(otherAutomationId, memberId));
      await expect(hasMemberEnteredAutomation()).resolves.toBe(false);
    });
  });

  alphabeticalDescribe('incrementEmailClickedCount', function () {
    const fixture = useEmailClickFixture();
    const { repository } = fixture;

    it.each([null, 0, 5])(
      'increments a count initially set to %s and leaves other revisions unchanged',
      async function (count) {
        await knex('automation_action_revisions')
          .where('id', fixture.revisionIds[0])
          .update({ email_clicked_count: count });

        await repository.incrementEmailClickedCount(knex, fixture.revisionIds[0]);

        const rows = await knex('automation_action_revisions')
          .whereIn('id', fixture.revisionIds)
          .select('id', 'email_clicked_count');
        expect(rows.find((row) => row.id === fixture.revisionIds[0])?.email_clicked_count).toBe(
          (count ?? 0) + 1,
        );
        expect(
          rows.find((row) => row.id === fixture.revisionIds[1])?.email_clicked_count,
        ).toBeNull();
      },
    );
  });

  alphabeticalDescribe('incrementEmailOpenedCount', function () {
    const { fixture, repository } = useEmailTrackingFixture();

    it('increments unset and existing counts without touching other revisions', async function () {
      await repository.incrementEmailOpenedCount(knex, fixture.revisionIds[0], 2);
      expect(
        await knex('automation_action_revisions')
          .select('id', 'email_opened_count')
          .whereIn('id', fixture.revisionIds)
          .orderBy('id'),
      ).toEqual(
        [
          { id: fixture.revisionIds[0], email_opened_count: 2 },
          { id: fixture.revisionIds[1], email_opened_count: 5 },
        ].sort((a, b) => a.id.localeCompare(b.id)),
      );

      await repository.incrementEmailOpenedCount(knex, fixture.revisionIds[1], 3);
      expect(
        (await knex('automation_action_revisions').where({ id: fixture.revisionIds[1] }).first())
          .email_opened_count,
      ).toBe(8);
    });
  });

  alphabeticalDescribe('insertActions', function () {
    let repository: ReturnType<typeof createDatabaseAutomationsRepository2>;
    let automationId: string;

    const createActionToInsert = (type: ActionToInsert['type']): ActionToInsert => ({
      id: ObjectId().toHexString(),
      automation_id: automationId,
      type,
      created_at: createdAt,
      updated_at: updatedAt,
    });

    const findActions = async () => {
      const rows = await knex('automation_actions')
        .select('id', 'automation_id', 'type', 'created_at', 'updated_at')
        .where('automation_id', automationId)
        .orderBy('id');
      return rows.map((row) => ({
        ...row,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    };

    beforeEach(async function () {
      repository = createDatabaseAutomationsRepository2({ knex });
      automationId = ObjectId().toHexString();
      await knex('automations').insert(createAutomation(automationId));
    });

    afterEach(async function () {
      await knex('automation_actions').where('automation_id', automationId).delete();
      await knex('automations').where('id', automationId).delete();
    });

    it('inserts multiple actions with their types and timestamps', async function () {
      const actions = [createActionToInsert('wait'), createActionToInsert('send_email')];

      await repository.withConnection((connection) =>
        repository.insertActions(connection, actions),
      );

      await expect(findActions()).resolves.toEqual(
        actions.toSorted((a, b) => a.id.localeCompare(b.id)),
      );
    });

    it('leaves existing actions unchanged when given an empty array', async function () {
      const action = createActionToInsert('wait');

      await repository.insertActions(knex, [action]);
      await repository.insertActions(knex, []);

      await expect(findActions()).resolves.toEqual([action]);
    });
  });

  alphabeticalDescribe('insertRunSteps', function () {
    let repository: ReturnType<typeof createDatabaseAutomationsRepository2>;
    let automationId: string;
    let memberId: string;
    let actionId: string;
    let revisionId: string;
    let runId: string;

    const findRunSteps = async () => {
      const rows = await knex('automation_run_steps')
        .select(
          'id',
          'automation_run_id',
          'automation_action_revision_id',
          'created_at',
          'updated_at',
          'ready_at',
        )
        .where('automation_run_id', runId)
        .orderBy('id');
      return rows.map((row) => ({
        ...row,
        created_at: fromDatabaseDate(row.created_at),
        updated_at: fromDatabaseDate(row.updated_at),
        ready_at: fromDatabaseDate(row.ready_at),
      }));
    };

    beforeEach(async function () {
      repository = createDatabaseAutomationsRepository2({ knex });
      automationId = ObjectId().toHexString();
      memberId = ObjectId().toHexString();
      actionId = ObjectId().toHexString();
      revisionId = ObjectId().toHexString();
      runId = ObjectId().toHexString();
      await knex('automations').insert(createAutomation(automationId));
      await knex('members').insert(createMember(memberId));
      await knex('automation_actions').insert({ ...createAction(automationId), id: actionId });
      await knex('automation_action_revisions').insert({
        ...createRevision(actionId),
        id: revisionId,
      });
      await knex('automation_runs').insert({ ...createRun(automationId, memberId), id: runId });
    });

    afterEach(async function () {
      await knex('automation_run_steps').where('automation_run_id', runId).delete();
      await knex('automation_runs').where('id', runId).delete();
      await knex('automation_action_revisions').where('id', revisionId).delete();
      await knex('automation_actions').where('id', actionId).delete();
      await knex('automations').where('id', automationId).delete();
      await knex('members').where('id', memberId).delete();
    });

    it('inserts multiple run steps', async function () {
      const steps = [
        createRunStep(runId, revisionId),
        { ...createRunStep(runId, revisionId), ready_at: new Date(readyAt.getTime() + 3600000) },
      ];
      await repository.withConnection((connection) => repository.insertRunSteps(connection, steps));
      await expect(findRunSteps()).resolves.toEqual(
        steps.toSorted((a, b) => a.id.localeCompare(b.id)),
      );
    });

    it('leaves existing run steps unchanged when given an empty array', async function () {
      const step = createRunStep(runId, revisionId);
      await repository.withConnection((connection) =>
        repository.insertRunSteps(connection, [step]),
      );
      await repository.withConnection((connection) => repository.insertRunSteps(connection, []));
      await expect(findRunSteps()).resolves.toHaveLength(1);
    });
  });

  alphabeticalDescribe('insertRuns', function () {
    let repository: ReturnType<typeof createDatabaseAutomationsRepository2>;
    let automationId: string;
    let memberId: string;

    const findRuns = async () => {
      const rows = await knex('automation_runs')
        .where({ automation_id: automationId })
        .orderBy('id');
      return rows.map((row) => ({
        ...row,
        created_at: fromDatabaseDate(row.created_at),
        updated_at: fromDatabaseDate(row.updated_at),
      }));
    };

    beforeEach(async function () {
      repository = createDatabaseAutomationsRepository2({ knex });
      automationId = ObjectId().toHexString();
      memberId = ObjectId().toHexString();
      await knex('automations').insert(createAutomation(automationId));
      await knex('members').insert(createMember(memberId));
    });

    afterEach(async function () {
      await knex('automation_runs').where('automation_id', automationId).delete();
      await knex('automations').where('id', automationId).delete();
      await knex('members').where('id', memberId).delete();
    });

    it('inserts multiple runs', async function () {
      const runs = [
        createRun(automationId, memberId),
        { ...createRun(automationId, memberId), member_email: 'other@example.com' },
      ];
      await repository.withConnection((connection) => repository.insertRuns(connection, runs));
      await expect(findRuns()).resolves.toEqual(
        runs
          .toSorted((a, b) => a.id.localeCompare(b.id))
          .map((run) => ({ ...run, created_at: createdAt, updated_at: updatedAt })),
      );
    });

    it('leaves existing runs unchanged when given an empty array', async function () {
      const run = createRun(automationId, memberId);
      await repository.withConnection((connection) => repository.insertRuns(connection, [run]));
      await repository.withConnection((connection) => repository.insertRuns(connection, []));
      await expect(findRuns()).resolves.toHaveLength(1);
    });
  });

  alphabeticalDescribe('isAutomationActiveForRun', function () {
    const isAutomationActiveForRun = async (status: string) => {
      const repository = createDatabaseAutomationsRepository2({ knex });

      const automation = { ...createAutomation(), status };
      const member = createMember(ObjectId().toHexString());
      const run = createRun(automation.id, member.id);

      await knex('automations').insert(automation);
      await knex('members').insert(member);
      await repository.insertRuns(knex, [run]);

      return await repository.isAutomationActiveForRun(knex, run.id);
    };

    it('resolves with true if the associated automation is active', async function () {
      await expect(isAutomationActiveForRun('active')).resolves.toBe(true);
    });

    it.each(['inactive', 'archived'])(
      'resolves with false if the associated automation is %s',
      async function (status) {
        await expect(isAutomationActiveForRun(status)).resolves.toBe(false);
      },
    );
  });

  alphabeticalDescribe('isAutomationActiveForRunStep', function () {
    const isAutomationActiveForRunStep = async (status: string) => {
      const repository = createDatabaseAutomationsRepository2({ knex });

      const automation = { ...createAutomation(), status };
      const member = createMember(ObjectId().toHexString());
      const action = createAction(automation.id);
      const revision = createRevision(action.id);
      const run = createRun(automation.id, member.id);
      const step = createRunStep(run.id, revision.id);

      await knex('automations').insert(automation);
      await knex('members').insert(member);
      await knex('automation_actions').insert(action);
      await knex('automation_action_revisions').insert(revision);
      await repository.insertRuns(knex, [run]);
      await repository.insertRunSteps(knex, [step]);

      return await repository.isAutomationActiveForRunStep(knex, step.id);
    };

    it('resolves with true if the associated automation is active', async function () {
      await expect(isAutomationActiveForRunStep('active')).resolves.toBe(true);
    });

    it.each(['inactive', 'archived'])(
      'resolves with false if the associated automation is %s',
      async function (status) {
        await expect(isAutomationActiveForRunStep(status)).resolves.toBe(false);
      },
    );
  });

  alphabeticalDescribe('loadEdgeRows', function () {
    let repository: ReturnType<typeof createDatabaseAutomationsRepository2>;
    let automationId: string;
    let otherAutomationId: string;
    let actions: ReturnType<typeof createAction>[];

    const insertEdges = async (edges: ReadonlyArray<EdgeRow>) => {
      await knex('automation_action_edges').insert(edges);
    };

    beforeEach(async function () {
      repository = createDatabaseAutomationsRepository2({ knex });

      automationId = ObjectId().toHexString();
      otherAutomationId = ObjectId().toHexString();
      actions = [
        createAction(automationId),
        createAction(automationId),
        createAction(automationId),
        createAction(otherAutomationId),
        createAction(otherAutomationId),
      ];

      await knex('automations').insert([
        createAutomation(automationId),
        createAutomation(otherAutomationId),
      ]);
      await knex('automation_actions').insert(actions);
    });

    afterEach(async function () {
      const actionIds = actions.map((action) => action.id);
      await knex('automation_action_edges').whereIn('source_action_id', actionIds).delete();
      await knex('automation_actions').whereIn('id', actionIds).delete();
      await knex('automations').whereIn('id', [automationId, otherAutomationId]).delete();
    });

    it('returns an empty array when the automation has no edges', async function () {
      await expect(repository.loadEdgeRows(knex, automationId)).resolves.toEqual([]);
    });

    it('returns edges scoped to the automation', async function () {
      const [first, second, third] = actions;
      const edges = [
        { source_action_id: first.id, target_action_id: second.id },
        { source_action_id: first.id, target_action_id: third.id },
        { source_action_id: second.id, target_action_id: third.id },
      ];
      const excludedEdges = [
        { source_action_id: actions[3].id, target_action_id: actions[4].id },
        { source_action_id: first.id, target_action_id: actions[3].id },
        { source_action_id: actions[3].id, target_action_id: first.id },
      ];
      await insertEdges([...edges, ...excludedEdges]);

      const result = await repository.withConnection((connection) =>
        repository.loadEdgeRows(connection, automationId),
      );

      const compareEdges = (a: Readonly<EdgeRow>, b: Readonly<EdgeRow>) =>
        a.source_action_id.localeCompare(b.source_action_id) ||
        a.target_action_id.localeCompare(b.target_action_id);
      expect(result.toSorted(compareEdges)).toEqual(edges.toSorted(compareEdges));
    });

    it.each([0, 1])('excludes edges when action %i is soft-deleted', async function (index) {
      await insertEdges([{ source_action_id: actions[0].id, target_action_id: actions[1].id }]);
      await knex('automation_actions').where('id', actions[index].id).update({ deleted_at: now });

      await expect(repository.loadEdgeRows(knex, automationId)).resolves.toEqual([]);
    });
  });

  alphabeticalDescribe('lockActionRevisions', function () {
    const fixture = useEmailClickFixture();
    const { repository } = fixture;

    it('accepts an empty list', async function () {
      await expect(repository.lockActionRevisions(knex, [])).resolves.toBeUndefined();
    });

    it('locks every unique revision from an iterable until transaction completion', async function () {
      const ids = [fixture.revisionIds[1], fixture.revisionIds[0], fixture.revisionIds[1]];
      const trx = await knex.transaction();

      try {
        await repository.lockActionRevisions(trx, ids);
        for (const id of fixture.revisionIds) {
          await repository.withTransaction(async (otherTrx) => {
            await expect(
              otherTrx('automation_action_revisions').where({ id }).forUpdate().noWait().first(),
            ).rejects.toMatchObject({ code: 'ER_LOCK_NOWAIT' });
          });
        }
      } finally {
        await trx.rollback();
      }
    });
  });

  alphabeticalDescribe('lockMember', function () {
    let repository: ReturnType<typeof createDatabaseAutomationsRepository2>;
    let memberId: string;

    beforeEach(async function () {
      repository = createDatabaseAutomationsRepository2({ knex });
      memberId = ObjectId().toHexString();
      await knex('members').insert(createMember(memberId));
    });

    afterEach(async function () {
      await knex('members').where('id', memberId).delete();
    });

    it('locks the member until the transaction ends', async function () {
      const trx = await knex.transaction();
      onTestFinished(async () => {
        await trx.rollback();
      });

      await repository.lockMember(trx, memberId);

      // Use `NOWAIT` to immediately fail if another transaction holds this row's lock.
      await repository.withTransaction(async (otherTrx) => {
        await expect(
          otherTrx('members').where('id', memberId).forUpdate().noWait().first(),
        ).rejects.toMatchObject({ code: 'ER_LOCK_NOWAIT' });
      });

      await trx.commit();

      await repository.withTransaction(async (otherTrx) => {
        await expect(
          otherTrx('members').where('id', memberId).forUpdate().noWait().first(),
        ).resolves.not.toThrow();
      });
    });
  });

  alphabeticalDescribe('lockNotYetOpenedEmailRecipients', function () {
    const { repository, ids } = useEmailTrackingFixture();

    it('returns an empty set without querying for an empty list', async function () {
      const query = vi.fn();
      knex.on('query', query);
      onTestFinished(() => {
        knex.off('query', query);
      });

      expect(await repository.lockNotYetOpenedEmailRecipients(knex, [])).toEqual(new Set());

      expect(query).not.toHaveBeenCalled();
    });

    it('returns only requested, existing recipients without an open timestamp', async function () {
      await repository.withTransaction(async (connection) => {
        expect(
          await repository.lockNotYetOpenedEmailRecipients(connection, [
            ids.unopened,
            ids.opened,
            ids.missing,
          ]),
        ).toEqual(new Set([ids.unopened]));
      });
    });

    it('locks unopened recipients until the transaction ends', async function () {
      const trx = await knex.transaction();
      onTestFinished(async () => {
        await trx.rollback();
      });
      const recipientIds = [ids.unopened, ids.other];

      expect(await repository.lockNotYetOpenedEmailRecipients(trx, recipientIds)).toEqual(
        new Set(recipientIds),
      );

      for (const id of recipientIds) {
        await repository.withTransaction(async (otherTrx) => {
          await expect(
            otherTrx('automated_email_recipients').where({ id }).forUpdate().noWait().first(),
          ).rejects.toMatchObject({ code: 'ER_LOCK_NOWAIT' });
        });
      }

      await trx.commit();

      for (const id of recipientIds) {
        await repository.withTransaction(async (otherTrx) => {
          await expect(
            otherTrx('automated_email_recipients').where({ id }).forUpdate().noWait().first(),
          ).resolves.toMatchObject({ id });
        });
      }
    });
  });

  alphabeticalDescribe('setEmailRecipientClickedAt', function () {
    const fixture = useEmailClickFixture();
    const { repository, findEmailRecipientForClick } = fixture;

    it('sets only the first timestamp and returns whether a row changed', async function () {
      expect(await repository.setEmailRecipientClickedAt(knex, fixture.recipientId, now)).toBe(
        true,
      );

      expect(await repository.setEmailRecipientClickedAt(knex, fixture.recipientId, later)).toBe(
        false,
      );

      expect(await findEmailRecipientForClick()).toEqual({
        id: fixture.recipientId,
        clicked_at: now,
      });
    });

    it('returns false for a missing recipient', async function () {
      expect(await repository.setEmailRecipientClickedAt(knex, ObjectId().toHexString(), now)).toBe(
        false,
      );
    });
  });

  alphabeticalDescribe('setEmailRecipientDeliveredAndOpenedAt', function () {
    const { repository, ids, earlier, laterEvent, getRecipient } = useEmailTrackingFixture();

    it('does not query when neither timestamp is supplied', async function () {
      const query = vi.fn();
      knex.on('query', query);
      onTestFinished(() => {
        knex.off('query', query);
      });

      await repository.setEmailRecipientDeliveredAndOpenedAt(knex, ids.unopened, {});

      expect(query).not.toHaveBeenCalled();
    });

    it('sets both timestamps', async function () {
      await repository.setEmailRecipientDeliveredAndOpenedAt(knex, ids.unopened, {
        deliveredAt: earlier,
        openedAt: laterEvent,
      });

      expect(await getRecipient(ids.unopened)).toEqual({
        deliveredAt: earlier,
        openedAt: laterEvent,
      });
    });

    it('updates delivery and open timestamps independently', async function () {
      await repository.setEmailRecipientDeliveredAndOpenedAt(knex, ids.unopened, {
        deliveredAt: earlier,
      });
      expect(await getRecipient(ids.unopened)).toEqual({ deliveredAt: earlier, openedAt: null });

      await repository.setEmailRecipientDeliveredAndOpenedAt(knex, ids.unopened, {
        openedAt: laterEvent,
      });
      expect(await getRecipient(ids.unopened)).toEqual({
        deliveredAt: earlier,
        openedAt: laterEvent,
      });
    });

    it('preserves earliest timestamps for later and repeated events', async function () {
      for (const timestamp of [laterEvent, earlier]) {
        await repository.setEmailRecipientDeliveredAndOpenedAt(knex, ids.opened, {
          deliveredAt: timestamp,
          openedAt: timestamp,
        });
        expect(await getRecipient(ids.opened)).toEqual({ deliveredAt: earlier, openedAt: earlier });
      }
    });

    it('replaces timestamps with earlier events', async function () {
      await knex('automated_email_recipients')
        .where({ id: ids.opened })
        .update({ delivered_at: laterEvent, opened_at: laterEvent });
      await repository.setEmailRecipientDeliveredAndOpenedAt(knex, ids.opened, {
        deliveredAt: earlier,
        openedAt: earlier,
      });
      expect(await getRecipient(ids.opened)).toEqual({ deliveredAt: earlier, openedAt: earlier });
    });

    it('ignores unknown recipients', async function () {
      await repository.setEmailRecipientDeliveredAndOpenedAt(knex, ids.missing, {
        deliveredAt: earlier,
        openedAt: earlier,
      });

      expect(
        await knex('automated_email_recipients')
          .whereIn('id', [ids.unopened, ids.opened, ids.other])
          .count('* as count')
          .first(),
      ).toEqual({
        count: 3,
      });
    });
  });

  alphabeticalDescribe('withConnection', function () {
    it('runs the callback and returns the result', async function () {
      const repository = createDatabaseAutomationsRepository2({ knex });

      const result = await repository.withConnection(async (connection) => {
        const row = await knex.select(knex.raw("'foo bar' as value")).first();
        return row.value;
      });

      expect(result).toBe('foo bar');
    });
  });

  alphabeticalDescribe('withTransaction', function () {
    it('runs the callback and returns the result', async function () {
      const repository = createDatabaseAutomationsRepository2({ knex });

      const result = await repository.withTransaction(async (trx) => {
        await trx.raw('SAVEPOINT test_trx_check');
        await trx.raw('RELEASE SAVEPOINT test_trx_check');
        return 'foo bar';
      });

      expect(result).toBe('foo bar');
    });
  });
});
