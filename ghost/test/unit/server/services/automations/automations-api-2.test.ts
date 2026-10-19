import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import { noop } from 'lodash';
import { createAutomationsApi2 } from '../../../../../core/server/services/automations/automations-api-2';
import type {
  AutomationsRepository2,
  LabelAddedRow,
  LabelTriggerRow,
  RunStepToInsert,
  RunToInsert,
} from '../../../../../core/server/services/automations/automations-repository-2';
import {
  LABEL_ADDED_BATCH_SIZE,
  LABEL_ADDED_OVERLAP_MS,
} from '../../../../../core/server/services/automations/constants';
import { StartAutomationsPollEvent } from '../../../../../core/server/services/automations/events/start-automations-poll-event';
import {
  createTestAutomationsRepository2,
  type TestAutomationsRepositoryConnection,
} from './test-automations-repository-2';

describe('automations API', function () {
  const createTestDomainEvents = () => ({
    dispatch: () => {
      throw new Error('domainEvents.dispatch should not be called');
    },
  });
  const createFakeLabs = (isAutomationsEnabled: boolean) => ({
    isSet: (flag: string) => {
      expect(flag).toBe('automations');
      return isAutomationsEnabled;
    },
  });
  const createApi = (
    overrides: Partial<
      Parameters<typeof createAutomationsApi2<TestAutomationsRepositoryConnection>>[0]
    > = {},
  ) =>
    createAutomationsApi2({
      domainEvents: createTestDomainEvents(),
      fakeWaitHoursMultiplier: null,
      labs: createFakeLabs(true),
      repository: createTestAutomationsRepository2(),
      ...overrides,
    });

  describe('alphabetical key order', function () {
    it('keeps its keys in alphabetical order for consistency', function () {
      const api = createApi();

      const actual = Object.keys(api);
      const expected = actual.toSorted();

      expect(actual).toEqual(expected);
    });
  });

  describe('enqueueLabelAddedRuns', function () {
    const now = new Date('2026-05-01T12:00:00.000Z');
    const startsAt = new Date('2026-05-01T09:00:00.000Z');
    const firstAction = {
      automation_id: 'automation-1',
      action_id: 'action-1',
      automation_action_revision_id: 'revision-1',
      type: 'wait' as const,
      wait_hours: 2,
    };

    const buildLabelTrigger = (overrides: Partial<LabelTriggerRow> = {}): LabelTriggerRow => ({
      automation_id: 'automation-1',
      label_id: 'label-1',
      starts_at: startsAt,
      checked_until: null,
      ...overrides,
    });

    const buildLabelAddedRow = (index: number, memberId = `member-${index}`): LabelAddedRow => ({
      id: `members-label-${index}`,
      created_at: new Date(startsAt.getTime() + index * 1000),
      member_id: memberId,
      member_email: `${memberId}@example.com`,
    });

    beforeEach(function () {
      vi.useFakeTimers({ now, toFake: ['Date'] });
    });

    afterEach(function () {
      vi.useRealTimers();
    });

    const createLabelRepository = ({
      labelTriggers = [buildLabelTrigger()],
      pages = [[buildLabelAddedRow(1), buildLabelAddedRow(2)]],
      isActive = true,
      hasFirstAction = true,
    }: {
      labelTriggers?: LabelTriggerRow[];
      pages?: LabelAddedRow[][];
      isActive?: boolean;
      hasFirstAction?: boolean;
    } = {}) => {
      const remainingPages = [...pages];
      return createTestAutomationsRepository2({
        findActiveLabelTriggers: vi.fn(() => labelTriggers),
        lockActiveLabelAddedAutomation: vi.fn(() => isActive),
        findFirstActionRevisionForAutomation: vi.fn(() => (hasFirstAction ? firstAction : null)),
        findMembersWithLabelAdded: vi.fn(() => remainingPages.shift() ?? []),
        insertRuns: vi.fn(),
        insertRunSteps: vi.fn(),
        setLabelTriggerCheckedUntil: vi.fn(),
      });
    };

    it('does nothing if automations are disabled', async function () {
      const api = createApi({ labs: createFakeLabs(false) });

      await expect(api.enqueueLabelAddedRuns()).resolves.toEqual({ hasLabelTriggers: false });
    });

    it('reports when there are no label triggers', async function () {
      const repository = createLabelRepository({ labelTriggers: [] });
      const api = createApi({ repository });

      await expect(api.enqueueLabelAddedRuns()).resolves.toEqual({ hasLabelTriggers: false });
      expect(repository.findMembersWithLabelAdded).not.toHaveBeenCalled();
    });

    it('enters members who had a trigger label added since the automation started', async function () {
      const domainEvents = { dispatch: vi.fn<(event: unknown) => unknown>() };
      const repository = createLabelRepository();
      const api = createApi({ domainEvents, repository });

      await expect(api.enqueueLabelAddedRuns()).resolves.toEqual({ hasLabelTriggers: true });

      expect(repository.findMembersWithLabelAdded).toHaveBeenCalledExactlyOnceWith(
        expect.anything(),
        {
          automationId: 'automation-1',
          labelId: 'label-1',
          from: startsAt,
          to: now,
          after: null,
          limit: LABEL_ADDED_BATCH_SIZE,
        },
      );

      const runs: RunToInsert[] = vi.mocked(repository.insertRuns).mock
        .calls[0][1] as RunToInsert[];
      const steps: RunStepToInsert[] = vi.mocked(repository.insertRunSteps).mock
        .calls[0][1] as RunStepToInsert[];
      expect(runs).toEqual([
        {
          id: expect.any(String),
          created_at: now,
          updated_at: now,
          automation_id: 'automation-1',
          member_id: 'member-1',
          member_email: 'member-1@example.com',
        },
        {
          id: expect.any(String),
          created_at: now,
          updated_at: now,
          automation_id: 'automation-1',
          member_id: 'member-2',
          member_email: 'member-2@example.com',
        },
      ]);
      expect(steps).toEqual(
        runs.map((run) => ({
          id: expect.any(String),
          automation_run_id: run.id,
          automation_action_revision_id: 'revision-1',
          created_at: now,
          updated_at: now,
          ready_at: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        })),
      );

      expect(repository.setLabelTriggerCheckedUntil).toHaveBeenCalledExactlyOnceWith(
        expect.anything(),
        'automation-1',
        'label-1',
        now,
      );
      expect(domainEvents.dispatch).toHaveBeenCalledExactlyOnceWith(
        expect.any(StartAutomationsPollEvent),
      );
    });

    it('re-checks a window before the last check, but not before the automation started', async function () {
      const lastCheckedUntil = new Date('2026-05-01T11:45:00.000Z');
      const repository = createLabelRepository({
        labelTriggers: [
          buildLabelTrigger({ label_id: 'recently-checked', checked_until: lastCheckedUntil }),
          buildLabelTrigger({
            label_id: 'recently-started',
            starts_at: new Date('2026-05-01T11:30:00.000Z'),
            checked_until: lastCheckedUntil,
          }),
        ],
        pages: [],
      });
      const api = createApi({ repository, domainEvents: { dispatch: noop } });

      await api.enqueueLabelAddedRuns();

      const froms = vi
        .mocked(repository.findMembersWithLabelAdded)
        .mock.calls.map((call) => (call[1] as { from: Date }).from);
      expect(froms).toEqual([
        new Date(lastCheckedUntil.getTime() - LABEL_ADDED_OVERLAP_MS),
        new Date('2026-05-01T11:30:00.000Z'),
      ]);
    });

    it('pages through label additions in batches', async function () {
      const firstPage = Array.from({ length: LABEL_ADDED_BATCH_SIZE }, (_, i) =>
        buildLabelAddedRow(i),
      );
      const secondPage = [buildLabelAddedRow(LABEL_ADDED_BATCH_SIZE)];
      const repository = createLabelRepository({ pages: [firstPage, secondPage] });
      const api = createApi({ repository, domainEvents: { dispatch: noop } });

      await api.enqueueLabelAddedRuns();

      const calls = vi.mocked(repository.findMembersWithLabelAdded).mock.calls;
      expect(calls).toHaveLength(2);
      expect((calls[1][1] as { after: unknown }).after).toEqual(firstPage.at(-1));
      expect(repository.insertRuns).toHaveBeenCalledTimes(2);
      expect(repository.setLabelTriggerCheckedUntil).toHaveBeenCalledOnce();
    });

    it('enters a member once, even if a batch has them twice', async function () {
      const repository = createLabelRepository({
        pages: [[buildLabelAddedRow(1, 'member-1'), buildLabelAddedRow(2, 'member-1')]],
      });
      const api = createApi({ repository, domainEvents: { dispatch: noop } });

      await api.enqueueLabelAddedRuns();

      const runs = vi.mocked(repository.insertRuns).mock.calls[0][1] as RunToInsert[];
      expect(runs.map((run) => run.member_id)).toEqual(['member-1']);
    });

    it.each([
      { specName: 'the automation is no longer active', isActive: false, hasFirstAction: true },
      { specName: 'the automation has no actions', isActive: true, hasFirstAction: false },
    ])('stops without entering members if $specName', async ({ isActive, hasFirstAction }) => {
      const repository = createLabelRepository({ isActive, hasFirstAction });
      const api = createApi({ repository });

      await api.enqueueLabelAddedRuns();

      expect(repository.findMembersWithLabelAdded).not.toHaveBeenCalled();
      expect(repository.insertRuns).not.toHaveBeenCalled();
      expect(repository.setLabelTriggerCheckedUntil).not.toHaveBeenCalled();
    });

    it("doesn't request a poll if nobody entered", async function () {
      const repository = createLabelRepository({ pages: [] });
      const api = createApi({ repository });

      await api.enqueueLabelAddedRuns();

      expect(repository.setLabelTriggerCheckedUntil).toHaveBeenCalledOnce();
    });
  });

  describe('findMembers', function () {
    it('combines members with their labels, newsletters, and tiers', async function () {
      const repository = createTestAutomationsRepository2({
        findMembers: () => [
          {
            id: 'member-1',
            email: 'one@example.com',
            name: 'One',
            uuid: 'uuid-1',
            status: 'paid',
            enable_updates_and_announcements: null,
          },
          {
            id: 'member-2',
            email: 'two@example.com',
            name: null,
            uuid: 'uuid-2',
            status: 'free',
            enable_updates_and_announcements: true,
          },
        ],
        findMemberLabels: () => [
          { member_id: 'member-1', related_id: 'label-1' },
          { member_id: 'member-1', related_id: 'label-2' },
          { member_id: 'deleted-member', related_id: 'label-1' },
        ],
        findMemberNewsletters: () => [
          { member_id: 'member-1', related_id: 'newsletter-1' },
          { member_id: 'member-1', related_id: 'newsletter-2' },
        ],
        findMemberTiers: () => [{ member_id: 'member-1', related_id: 'tier-1' }],
      });
      const api = createApi({ repository });

      const members = await api.findMembers(['member-1', 'member-2', 'deleted-member']);

      expect(Object.fromEntries(members)).toEqual({
        'member-1': {
          id: 'member-1',
          email: 'one@example.com',
          name: 'One',
          uuid: 'uuid-1',
          status: 'paid',
          enable_updates_and_announcements: null,
          is_subscribed_to_any_newsletter: true,
          label_ids: ['label-1', 'label-2'],
          tier_ids: ['tier-1'],
        },
        'member-2': {
          id: 'member-2',
          email: 'two@example.com',
          name: null,
          uuid: 'uuid-2',
          status: 'free',
          enable_updates_and_announcements: true,
          is_subscribed_to_any_newsletter: false,
          label_ids: [],
          tier_ids: [],
        },
      });
    });
  });

  describe('getNumberOfAutomations', function () {
    it('returns the number of automations', async function () {
      const repository = createTestAutomationsRepository2({
        getNumberOfAutomations: () => 123,
      });
      const api = createApi({ repository });

      await expect(api.getNumberOfAutomations()).resolves.toBe(123);
    });
  });

  describe('requestPoll', function () {
    it('dispatches a "start automations poll" event', function () {
      const domainEvents = { dispatch: vi.fn<(event: unknown) => unknown>() };
      const api = createApi({ domainEvents });

      api.requestPoll();

      expect(domainEvents.dispatch).toHaveBeenCalledExactlyOnceWith(
        expect.any(StartAutomationsPollEvent),
      );
    });
  });

  describe('trigger', function () {
    type Repository = AutomationsRepository2<TestAutomationsRepositoryConnection>;
    type FirstAction = Awaited<ReturnType<Repository['findFirstActionRevisions']>>[number];

    let repository: ReturnType<typeof createTestAutomationsRepository2>;
    let domainEvents: { dispatch: ReturnType<typeof vi.fn<(event: unknown) => unknown>> };
    let trigger: Parameters<ReturnType<typeof createApi>['trigger']>[0];
    let firstActions: FirstAction[];
    let runs: Array<Pick<RunToInsert, 'id' | 'automation_id' | 'member_id'>>;
    let steps: RunStepToInsert[];

    const now = new Date('2026-01-02T03:04:05Z');

    const createFirstAction = (): FirstAction => ({
      automation_id: ObjectId().toHexString(),
      action_id: ObjectId().toHexString(),
      automation_action_revision_id: ObjectId().toHexString(),
      type: 'wait',
      wait_hours: 2,
    });

    beforeEach(function () {
      vi.useFakeTimers();
      vi.setSystemTime(now);

      firstActions = [];
      runs = [];
      steps = [];
      domainEvents = { dispatch: vi.fn<(event: unknown) => unknown>() };
      trigger = {
        event: 'membership_started',
        memberEmail: 'member@example.com',
        memberId: ObjectId().toHexString(),
        memberStatus: 'free',
        memberTierIds: [],
      };

      repository = createTestAutomationsRepository2({
        lockMember: noop,
        findFirstActionRevisions: () => firstActions,
        hasMemberEnteredAutomation: (_connection, automationId, memberId) =>
          runs.some((run) => run.automation_id === automationId && run.member_id === memberId),
        insertRuns: (_connection, toInsert) => {
          runs.push(...toInsert);
        },
        insertRunSteps: (_connection, toInsert) => {
          steps.push(...toInsert);
        },
      });
    });

    afterEach(function () {
      vi.useRealTimers();
    });

    it('fails if called with an unexpected `event`', async function () {
      const withTransaction = vi.fn();
      const api = createApi({ repository: { ...repository, withTransaction } });

      const events = [undefined, 'invalid', 'membership_ended', 'membership_did_start'];
      await Promise.all(
        events.map(async (event) => {
          await expect(() =>
            api.trigger({
              event: event as any,
              memberEmail: 'foo@example.com',
              memberId: 'abc',
              memberStatus: 'free',
              memberTierIds: [],
            }),
          ).rejects.toThrow(errors.IncorrectUsageError);
        }),
      );

      expect(withTransaction).not.toHaveBeenCalled();
      expect(domainEvents.dispatch).not.toHaveBeenCalled();
    });

    it('does nothing if the labs flag is disabled', async function () {
      const withTransaction = vi.fn();
      const api = createApi({
        labs: createFakeLabs(false),
        repository: { ...repository, withTransaction },
        domainEvents,
      });

      await api.trigger(trigger);

      expect(withTransaction).not.toHaveBeenCalled();
      expect(domainEvents.dispatch).not.toHaveBeenCalled();
    });

    it('locks the member before any other repository operation', async function () {
      const lockMember = vi.fn();
      const findFirstActionRevisions = vi.fn().mockReturnValue([createFirstAction()]);
      const hasMemberEnteredAutomation = vi.fn().mockReturnValue(false);
      const insertRuns = vi.fn();
      const insertRunSteps = vi.fn();

      const api = createApi({
        repository: createTestAutomationsRepository2({
          lockMember,
          findFirstActionRevisions,
          hasMemberEnteredAutomation,
          insertRuns,
          insertRunSteps,
        }),
        domainEvents,
      });

      await api.trigger(trigger);

      expect(lockMember).toHaveBeenCalledBefore(findFirstActionRevisions);
      expect(lockMember).toHaveBeenCalledBefore(hasMemberEnteredAutomation);
      expect(lockMember).toHaveBeenCalledBefore(insertRunSteps);
      expect(lockMember).toHaveBeenCalledBefore(insertRuns);
    });

    it('enrolls the member in matching automations and queues their first actions', async function () {
      const wait = createFirstAction();
      const email: FirstAction = { ...createFirstAction(), type: 'send_email' };
      firstActions = [wait, email];
      const api = createApi({ repository, domainEvents });

      await api.trigger(trigger);

      expect(runs).toEqual(
        firstActions.map((action) => ({
          id: expect.any(String),
          automation_id: action.automation_id,
          member_id: trigger.memberId,
          member_email: trigger.memberEmail,
          created_at: now,
          updated_at: now,
        })),
      );
      expect(steps).toEqual([
        {
          id: expect.any(String),
          automation_run_id: runs[0].id,
          automation_action_revision_id: wait.automation_action_revision_id,
          created_at: now,
          updated_at: now,
          ready_at: new Date('2026-01-02T05:04:05Z'),
        },
        {
          id: expect.any(String),
          automation_run_id: runs[1].id,
          automation_action_revision_id: email.automation_action_revision_id,
          created_at: now,
          updated_at: now,
          ready_at: now,
        },
      ]);
      expect(new Set([...runs, ...steps].map((row) => row.id)).size).toBe(4);
      expect(domainEvents.dispatch).toHaveBeenCalledExactlyOnceWith(
        expect.any(StartAutomationsPollEvent),
      );
    });

    it.each(['free', 'paid'] as const)(
      'looks up matching automations for %s members',
      async function (memberStatus) {
        const memberTierIds = [ObjectId().toHexString(), ObjectId().toHexString()];
        const findFirstActionRevisions = vi.fn().mockReturnValue([]);
        const api = createApi({
          repository: { ...repository, findFirstActionRevisions },
          domainEvents,
        });

        await api.trigger({ ...trigger, memberStatus, memberTierIds });

        expect(findFirstActionRevisions).toHaveBeenCalledExactlyOnceWith(
          expect.anything(),
          memberStatus,
          memberTierIds,
        );
      },
    );

    it('skips automations the member has already entered while enrolling in new ones', async function () {
      const entered = createFirstAction();
      const available = createFirstAction();
      firstActions = [entered, available];
      runs = [
        {
          id: ObjectId().toHexString(),
          automation_id: entered.automation_id,
          member_id: trigger.memberId,
        },
      ];
      const api = createApi({ repository, domainEvents });

      await api.trigger(trigger);

      expect(runs).toHaveLength(2);
      expect(runs[1]?.automation_id).toBe(available.automation_id);
      expect(steps).toHaveLength(1);
      expect(steps[0]?.automation_action_revision_id).toBe(available.automation_action_revision_id);
      expect(steps[0]?.automation_run_id).toBe(runs[1]?.id);
    });

    it('inserts no runs or steps when there are no matching automations', async function () {
      const api = createApi({ repository, domainEvents });

      await api.trigger(trigger);

      expect(runs).toHaveLength(0);
      expect(steps).toHaveLength(0);
    });

    it('applies the fake wait-hours multiplier when scheduling a wait action', async function () {
      firstActions = [createFirstAction()];
      const api = createApi({ repository, domainEvents, fakeWaitHoursMultiplier: 100 });

      await api.trigger(trigger);

      expect(steps).toHaveLength(1);
      expect(steps[0].ready_at).toEqual(new Date(now.getTime() + 200));
    });

    it.each([
      'lockMember',
      'findFirstActionRevisions',
      'hasMemberEnteredAutomation',
      'insertRuns',
      'insertRunSteps',
    ] as const)('propagates %s failures without requesting a poll', async function (method) {
      firstActions = [createFirstAction()];
      const failure = new Error(`${method} failed`);
      const api = createApi({
        repository: {
          ...repository,
          [method]: () => {
            throw failure;
          },
        },
        domainEvents,
      });

      await expect(api.trigger(trigger)).rejects.toBe(failure);

      expect(domainEvents.dispatch).not.toHaveBeenCalled();
    });
  });
});
