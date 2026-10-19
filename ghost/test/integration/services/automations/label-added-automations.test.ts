import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { fromDatabaseDate, toDatabaseDate } from '../../../../core/server/lib/db-types/date';
import { createAutomationsApi2 } from '../../../../core/server/services/automations/automations-api-2';
import { createDatabaseAutomationsRepository } from '../../../../core/server/services/automations/database-automations-repository';
import { createDatabaseAutomationsRepository2 } from '../../../../core/server/services/automations/database-automations-repository-2';
// @ts-expect-error This module lacks type definitions.
import models from '../../../../core/server/models';
// @ts-expect-error This module lacks type definitions.
import testUtils from '../../../utils';
// @ts-expect-error This module lacks type definitions.
import * as dbUtils from '../../../utils/db-utils';

const SECOND_MS = 1000;
const HOUR_MS = 60 * 60 * SECOND_MS;

describe('label added automations', function () {
  const knex: Knex = testUtils.knex;
  const repository = createDatabaseAutomationsRepository({ knex, fakeWaitHoursMultiplier: null });
  const repository2 = createDatabaseAutomationsRepository2({ knex });

  let labelIds: string[];
  let memberIds: string[];
  let automationIds: string[];

  beforeAll(async function () {
    await dbUtils.reset({ truncate: true });
    await testUtils.setup('default')();
  });

  beforeEach(function () {
    labelIds = [];
    memberIds = [];
    automationIds = [];
  });

  afterEach(async function () {
    const runIds = await knex('automation_runs')
      .whereIn('automation_id', automationIds)
      .pluck('id');
    await knex('automation_run_steps').whereIn('automation_run_id', runIds).delete();
    await knex('automation_runs').whereIn('id', runIds).delete();
    const actionIds = await knex('automation_actions')
      .whereIn('automation_id', automationIds)
      .pluck('id');
    await knex('automation_action_edges').whereIn('source_action_id', actionIds).delete();
    await knex('automation_action_revisions').whereIn('action_id', actionIds).delete();
    await knex('automation_actions').whereIn('id', actionIds).delete();
    await knex('automations').whereIn('id', automationIds).delete();
    await knex('members').whereIn('id', memberIds).delete();
    await knex('labels').whereIn('id', labelIds).delete();
  });

  const insertLabel = async (): Promise<string> => {
    const id = ObjectId().toHexString();
    labelIds.push(id);
    await knex('labels').insert({
      id,
      name: `Label ${id}`,
      slug: `label-${id}`,
      created_at: toDatabaseDate(new Date()),
    });
    return id;
  };

  const insertMember = async (overrides: Record<string, unknown> = {}): Promise<string> => {
    const id = ObjectId().toHexString();
    memberIds.push(id);
    await knex('members').insert({
      id,
      uuid: randomUUID(),
      transient_id: randomUUID(),
      email: `${id}@example.com`,
      status: 'free',
      created_at: toDatabaseDate(new Date()),
      ...overrides,
    });
    return id;
  };

  const addLabel = async (memberId: string, labelId: string, createdAt: Date | null) => {
    const id = ObjectId().toHexString();
    await knex('members_labels').insert({
      id,
      member_id: memberId,
      label_id: labelId,
      sort_order: 0,
      created_at: createdAt ? toDatabaseDate(createdAt) : null,
    });
    return id;
  };

  const addAutomation = async ({
    status = 'active',
    triggerLabelIds,
  }: {
    status?: 'active' | 'inactive';
    triggerLabelIds: string[];
  }) => {
    const waitId = ObjectId().toHexString();
    const automation = await repository.add({
      name: `Label automation ${ObjectId().toHexString()}`,
      description: '',
      status,
      trigger_type: 'label_added',
      trigger_label_ids: triggerLabelIds,
      actions: [{ id: waitId, type: 'wait', data: { wait_hours: 1 } }],
      edges: [],
    });
    automationIds.push(automation.id);
    return automation;
  };

  const loadTriggerLabels = (automationId: string) =>
    knex('automation_trigger_labels').where('automation_id', automationId).orderBy('label_id');

  describe('recording when labels are added', function () {
    it('records when a label is added to a member', async function () {
      const label = await insertLabel();
      const memberId = await insertMember();
      const before = new Date(Date.now() - SECOND_MS);

      await models.Member.edit(
        { labels: [{ id: label, name: `Label ${label}` }] },
        { id: memberId },
      );

      const memberLabel = await knex('members_labels')
        .where({ member_id: memberId, label_id: label })
        .first();
      assert.ok(fromDatabaseDate(memberLabel.created_at) >= before);
    });
  });

  describe('saving automations', function () {
    it('adds and reads label triggers', async function () {
      const labelA = await insertLabel();
      const labelB = await insertLabel();
      const before = new Date(Date.now() - SECOND_MS);

      const automation = await addAutomation({ triggerLabelIds: [labelB, labelA] });

      assert.equal(automation.trigger_type, 'label_added');
      assert.equal(automation.trigger_tier_scope, null);
      assert.equal(automation.trigger_tier_ids, null);
      assert.deepEqual(automation.trigger_label_ids, [labelA, labelB].sort());
      assert.deepEqual(await repository.getById(automation.id), automation);

      const triggerLabels = await loadTriggerLabels(automation.id);
      assert.equal(triggerLabels.length, 2);
      for (const triggerLabel of triggerLabels) {
        assert.ok(fromDatabaseDate(triggerLabel.starts_at) >= before);
        assert.equal(triggerLabel.checked_until, null);
      }

      const browsed = await repository.browse({ includeStats: false });
      assert.equal(
        browsed.data.find((summary) => summary.id === automation.id)?.trigger_type,
        'label_added',
      );
    });

    it('rejects labels that do not exist', async function () {
      await assert.rejects(
        addAutomation({ triggerLabelIds: [ObjectId().toHexString()] }),
        (err: unknown) => err instanceof errors.ValidationError,
      );
    });

    it('keeps existing trigger labels when editing, and starts new ones from now', async function () {
      const kept = await insertLabel();
      const removed = await insertLabel();
      const added = await insertLabel();
      const automation = await addAutomation({ triggerLabelIds: [kept, removed] });
      const longAgo = toDatabaseDate(new Date('2026-01-01T00:00:00Z'));
      await knex('automation_trigger_labels')
        .where('automation_id', automation.id)
        .update({ starts_at: longAgo, checked_until: longAgo });

      const edited = await repository.edit(automation.id, {
        ...automation,
        trigger_type: 'label_added',
        trigger_tier_scope: null,
        trigger_tier_ids: null,
        trigger_label_ids: [kept, added],
      });

      assert.deepEqual(edited?.trigger_label_ids, [kept, added].sort());
      const triggerLabels = await loadTriggerLabels(automation.id);
      const keptRow = triggerLabels.find((row) => row.label_id === kept);
      const addedRow = triggerLabels.find((row) => row.label_id === added);
      assert.equal(triggerLabels.length, 2);
      assert.equal(toDatabaseDate(keptRow.starts_at), longAgo);
      assert.equal(toDatabaseDate(keptRow.checked_until), longAgo);
      assert.ok(fromDatabaseDate(addedRow.starts_at) > new Date('2026-01-01T00:00:00Z'));
      assert.equal(addedRow.checked_until, null);
    });

    it('starts all trigger labels from now when the automation is activated', async function () {
      const label = await insertLabel();
      const automation = await addAutomation({ status: 'inactive', triggerLabelIds: [label] });
      const longAgo = toDatabaseDate(new Date('2026-01-01T00:00:00Z'));
      await knex('automation_trigger_labels')
        .where('automation_id', automation.id)
        .update({ starts_at: longAgo, checked_until: longAgo });

      await repository.edit(automation.id, { ...automation, status: 'active' });

      const [triggerLabel] = await loadTriggerLabels(automation.id);
      assert.ok(fromDatabaseDate(triggerLabel.starts_at) > new Date('2026-01-01T00:00:00Z'));
      assert.equal(triggerLabel.checked_until, null);
    });

    it('keeps the trigger type when an older client omits it', async function () {
      const label = await insertLabel();
      const automation = await addAutomation({ triggerLabelIds: [label] });

      const edited = await repository.edit(automation.id, {
        name: automation.name,
        description: automation.description,
        status: automation.status,
        actions: automation.actions,
        edges: automation.edges,
        trigger_tier_scope: null,
        trigger_tier_ids: null,
      });

      assert.equal(edited?.trigger_type, 'label_added');
      assert.deepEqual(edited?.trigger_label_ids, [label]);
    });

    it('switches between trigger types', async function () {
      const label = await insertLabel();
      const automation = await addAutomation({ triggerLabelIds: [label] });

      const membershipAutomation = await repository.edit(automation.id, {
        ...automation,
        trigger_type: 'membership_started',
        trigger_tier_scope: 'free',
        trigger_tier_ids: null,
        trigger_label_ids: null,
      });
      assert.equal(membershipAutomation?.trigger_type, 'membership_started');
      assert.equal(membershipAutomation?.trigger_tier_scope, 'free');
      assert.equal(membershipAutomation?.trigger_label_ids, null);
      assert.deepEqual(await loadTriggerLabels(automation.id), []);

      const labelAutomation = await repository.edit(automation.id, {
        ...automation,
        trigger_type: 'label_added',
        trigger_tier_scope: null,
        trigger_tier_ids: null,
        trigger_label_ids: [label],
      });
      assert.equal(labelAutomation?.trigger_type, 'label_added');
      assert.equal(labelAutomation?.trigger_tier_scope, null);
      assert.deepEqual(labelAutomation?.trigger_label_ids, [label]);
    });

    it('removes deleted labels from triggers', async function () {
      const label = await insertLabel();
      const automation = await addAutomation({ triggerLabelIds: [label] });

      await knex('labels').where('id', label).delete();

      assert.deepEqual((await repository.getById(automation.id))?.trigger_label_ids, []);
    });
  });

  describe('repository', function () {
    it('finds trigger labels of active label added automations only', async function () {
      const label = await insertLabel();
      const active = await addAutomation({ triggerLabelIds: [label] });
      await addAutomation({ status: 'inactive', triggerLabelIds: [label] });

      const triggers = await repository2.findActiveLabelTriggers(knex);

      expect(triggers.filter((trigger) => automationIds.includes(trigger.automation_id))).toEqual([
        {
          automation_id: active.id,
          label_id: label,
          starts_at: expect.any(Date),
          checked_until: null,
        },
      ]);
    });

    it('finds the first action of an automation', async function () {
      const label = await insertLabel();
      const automation = await addAutomation({ triggerLabelIds: [label] });

      expect(await repository2.findFirstActionRevisionForAutomation(knex, automation.id)).toEqual({
        automation_id: automation.id,
        action_id: automation.actions[0].id,
        automation_action_revision_id: expect.any(String),
        type: 'wait',
        wait_hours: 1,
      });
      assert.equal(
        await repository2.findFirstActionRevisionForAutomation(knex, ObjectId().toHexString()),
        null,
      );
    });

    it('locks only active label added automations', async function () {
      const label = await insertLabel();
      const active = await addAutomation({ triggerLabelIds: [label] });
      const inactive = await addAutomation({ status: 'inactive', triggerLabelIds: [label] });

      await knex.transaction(async (trx) => {
        assert.equal(await repository2.lockActiveLabelAddedAutomation(trx, active.id), true);
        assert.equal(await repository2.lockActiveLabelAddedAutomation(trx, inactive.id), false);
      });
    });

    it('finds members who had a label added in a time range and have not entered', async function () {
      const label = await insertLabel();
      const otherLabel = await insertLabel();
      const automation = await addAutomation({ triggerLabelIds: [label] });
      const from = new Date('2026-05-01T10:00:00Z');
      const to = new Date('2026-05-01T11:00:00Z');

      const included1 = await insertMember();
      const included2 = await insertMember();
      const tooEarly = await insertMember();
      const tooLate = await insertMember();
      const unknownTime = await insertMember();
      const otherLabelMember = await insertMember();
      const alreadyEntered = await insertMember();

      await addLabel(included2, label, new Date('2026-05-01T10:30:00Z'));
      await addLabel(included1, label, from);
      await addLabel(tooEarly, label, new Date(from.getTime() - SECOND_MS));
      await addLabel(tooLate, label, new Date(to.getTime() + SECOND_MS));
      await addLabel(unknownTime, label, null);
      await addLabel(otherLabelMember, otherLabel, new Date('2026-05-01T10:30:00Z'));
      await addLabel(alreadyEntered, label, new Date('2026-05-01T10:30:00Z'));
      await knex('automation_runs').insert({
        id: ObjectId().toHexString(),
        automation_id: automation.id,
        member_id: alreadyEntered,
        member_email: 'entered@example.com',
        created_at: toDatabaseDate(new Date()),
        updated_at: toDatabaseDate(new Date()),
      });

      const rows = await repository2.findMembersWithLabelAdded(knex, {
        automationId: automation.id,
        labelId: label,
        from,
        to,
        after: null,
        limit: 100,
      });

      assert.deepEqual(
        rows.map((row) => row.member_id),
        [included1, included2],
      );
      expect(rows[0]).toEqual({
        id: expect.any(String),
        created_at: from,
        member_id: included1,
        member_email: `${included1}@example.com`,
      });
    });

    it('pages through label additions, including ties', async function () {
      const label = await insertLabel();
      const automation = await addAutomation({ triggerLabelIds: [label] });
      const sameTime = new Date('2026-05-01T10:00:00Z');
      for (let i = 0; i < 5; i++) {
        await addLabel(
          await insertMember(),
          label,
          i < 3 ? sameTime : new Date('2026-05-01T10:00:01Z'),
        );
      }

      const options = {
        automationId: automation.id,
        labelId: label,
        from: new Date('2026-05-01T00:00:00Z'),
        to: new Date('2026-05-02T00:00:00Z'),
        limit: 2,
      };
      const seen: string[] = [];
      let after = null;
      while (true) {
        const rows = await repository2.findMembersWithLabelAdded(knex, { ...options, after });
        seen.push(...rows.map((row) => row.member_id));
        if (rows.length < options.limit) {
          break;
        }
        after = rows[rows.length - 1];
      }

      assert.deepEqual(new Set(seen), new Set(memberIds));
      assert.equal(seen.length, memberIds.length);
    });

    it('records when a trigger label was checked', async function () {
      const label = await insertLabel();
      const automation = await addAutomation({ triggerLabelIds: [label] });
      const checkedUntil = new Date('2026-05-01T10:00:00Z');

      await repository2.setLabelTriggerCheckedUntil(knex, automation.id, label, checkedUntil);

      const [triggerLabel] = await loadTriggerLabels(automation.id);
      assert.deepEqual(fromDatabaseDate(triggerLabel.checked_until), checkedUntil);
    });

    it("loads members' labels, newsletters, and tiers", async function () {
      const label = await insertLabel();
      const memberId = await insertMember({ enable_updates_and_announcements: true, name: 'Ada' });
      await addLabel(memberId, label, null);

      expect(await repository2.findMembers(knex, [memberId])).toEqual([
        {
          id: memberId,
          email: `${memberId}@example.com`,
          name: 'Ada',
          uuid: expect.any(String),
          status: 'free',
          enable_updates_and_announcements: true,
        },
      ]);
      assert.deepEqual(await repository2.findMemberLabels(knex, [memberId]), [
        { member_id: memberId, related_id: label },
      ]);
      assert.deepEqual(await repository2.findMemberNewsletters(knex, [memberId]), []);
      assert.deepEqual(await repository2.findMemberTiers(knex, [memberId]), []);
    });
  });

  describe('entering members', function () {
    it('enters members who had any trigger label added after the automation started, once', async function () {
      const vip = await insertLabel();
      const california = await insertLabel();
      const automation = await addAutomation({ triggerLabelIds: [vip, california] });
      const [triggerLabel] = await loadTriggerLabels(automation.id);
      const startsAt = fromDatabaseDate(triggerLabel.starts_at);
      const afterStart = new Date(startsAt.getTime() + SECOND_MS);

      const vipMember = await insertMember();
      const bothMember = await insertMember();
      const labeledBeforeStart = await insertMember();
      await addLabel(vipMember, vip, afterStart);
      await addLabel(bothMember, vip, afterStart);
      await addLabel(bothMember, california, afterStart);
      await addLabel(labeledBeforeStart, vip, new Date(startsAt.getTime() - HOUR_MS));

      const api = createAutomationsApi2({
        domainEvents: { dispatch: () => {} },
        fakeWaitHoursMultiplier: null,
        labs: { isSet: () => true },
        repository: repository2,
      });

      vi.useFakeTimers({ now: new Date(afterStart.getTime() + SECOND_MS), toFake: ['Date'] });
      try {
        assert.deepEqual(await api.enqueueLabelAddedRuns(), { hasLabelTriggers: true });
        // Checking again doesn't enter anybody twice.
        await api.enqueueLabelAddedRuns();
      } finally {
        vi.useRealTimers();
      }

      const runs = await knex('automation_runs').where('automation_id', automation.id);
      assert.deepEqual(new Set(runs.map((run) => run.member_id)), new Set([vipMember, bothMember]));
      assert.equal(runs.length, 2);
      const steps = await knex('automation_run_steps').whereIn(
        'automation_run_id',
        runs.map((run) => run.id),
      );
      assert.equal(steps.length, 2);
      for (const step of steps) {
        assert.equal(step.status, 'pending');
      }
    });
  });

  describe('running steps in batches', function () {
    const enterMembers = async (count: number) => {
      const label = await insertLabel();
      const firstActionId = ObjectId().toHexString();
      const secondActionId = ObjectId().toHexString();
      const automation = await repository.add({
        name: `Batch automation ${ObjectId().toHexString()}`,
        description: '',
        status: 'active',
        trigger_type: 'label_added',
        trigger_label_ids: [label],
        actions: [
          { id: firstActionId, type: 'wait', data: { wait_hours: 1 } },
          { id: secondActionId, type: 'wait', data: { wait_hours: 2 } },
        ],
        edges: [{ source_action_id: firstActionId, target_action_id: secondActionId }],
      });
      automationIds.push(automation.id);

      const revisionId = (
        await knex('automation_action_revisions')
          .where('action_id', automation.actions[0].id)
          .first('id')
      ).id;
      const past = toDatabaseDate(new Date(Date.now() - HOUR_MS));
      for (let i = 0; i < count; i++) {
        const memberId = await insertMember();
        const runId = ObjectId().toHexString();
        await knex('automation_runs').insert({
          id: runId,
          automation_id: automation.id,
          member_id: memberId,
          member_email: `${memberId}@example.com`,
          created_at: past,
          updated_at: past,
        });
        await knex('automation_run_steps').insert({
          id: ObjectId().toHexString(),
          automation_run_id: runId,
          automation_action_revision_id: revisionId,
          created_at: past,
          updated_at: past,
          ready_at: past,
        });
      }
      return automation;
    };

    it('finishes steps and enqueues their next steps', async function () {
      const automation = await enterMembers(3);
      const { steps } = await repository.fetchAndLockSteps(10);
      const ourSteps = steps.filter((step) => step.automation_id === automation.id);
      assert.equal(ourSteps.length, 3);
      assert.deepEqual(ourSteps[0].automation_trigger_label_ids, automation.trigger_label_ids);

      const nextReadyAt = await repository.finishStepsAndEnqueueNext(ourSteps);

      assert.ok(nextReadyAt);
      assert.ok(nextReadyAt.getTime() > Date.now() + HOUR_MS);
      const statuses = await knex('automation_run_steps as step')
        .innerJoin('automation_runs as run', 'run.id', 'step.automation_run_id')
        .where('run.automation_id', automation.id)
        .select('step.status')
        .orderBy('step.status');
      assert.deepEqual(
        statuses.map((row) => row.status),
        ['finished', 'finished', 'finished', 'pending', 'pending', 'pending'],
      );

      // Finishing again does nothing because the steps are no longer locked.
      assert.equal(await repository.finishStepsAndEnqueueNext(ourSteps), null);
    });

    it('marks steps terminal, but only steps that are still locked', async function () {
      const automation = await enterMembers(2);
      const { steps } = await repository.fetchAndLockSteps(10);
      const [step1, step2] = steps.filter((step) => step.automation_id === automation.id);
      await knex('automation_run_steps')
        .where('id', step2.id)
        .update({ locked_by: 'someone else' });

      assert.equal(await repository.markStepsTerminal([step1, step2], 'member changed status'), 1);

      assert.equal(
        (await knex('automation_run_steps').where('id', step1.id).first()).status,
        'member changed status',
      );
      assert.equal(
        (await knex('automation_run_steps').where('id', step2.id).first()).status,
        'pending',
      );
    });

    it("doesn't enqueue next steps for inactive automations", async function () {
      const automation = await enterMembers(1);
      const { steps } = await repository.fetchAndLockSteps(10);
      const ourSteps = steps.filter((step) => step.automation_id === automation.id);
      await knex('automations').where('id', automation.id).update({ status: 'inactive' });

      assert.equal(await repository.finishStepsAndEnqueueNext(ourSteps), null);

      const count = await knex('automation_run_steps')
        .whereIn(
          'automation_run_id',
          ourSteps.map((step) => step.automation_run_id),
        )
        .count({ count: '*' })
        .first();
      assert.equal(Number(count?.count), 1);
    });
  });
});
