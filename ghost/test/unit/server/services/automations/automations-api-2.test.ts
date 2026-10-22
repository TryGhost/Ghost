import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import { noop } from 'lodash';
import { createAutomationsApi2 } from '../../../../../core/server/services/automations/automations-api-2';
import type {
  AutomationsRepository2,
  RunStepToInsert,
  RunToInsert,
} from '../../../../../core/server/services/automations/automations-repository-2';
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

    it('enrolls subscription changes once, even after later qualifying changes', async function () {
      firstActions = [createFirstAction()];
      const api = createApi({ repository, domainEvents });
      const change = {
        ...trigger,
        event: 'paid_subscription_changed' as const,
        previousMemberStatus: 'paid' as const,
        previousMemberTierIds: ['bronze'],
        memberStatus: 'paid' as const,
        memberTierIds: ['gold'],
      };
      await api.trigger(change);
      await api.trigger(change);
      await api.trigger({ ...change, previousMemberTierIds: ['silver'] });
      expect(runs).toHaveLength(1);
      expect(steps).toHaveLength(1);
      expect(domainEvents.dispatch).toHaveBeenCalledTimes(1);
    });

    it.each([
      {
        previousMemberStatus: 'free',
        memberStatus: 'paid',
        previousMemberTierIds: [],
        memberTierIds: ['gold'],
      },
      {
        previousMemberStatus: 'gift',
        memberStatus: 'paid',
        previousMemberTierIds: ['bronze'],
        memberTierIds: ['gold'],
      },
      {
        previousMemberStatus: 'comped',
        memberStatus: 'paid',
        previousMemberTierIds: ['bronze'],
        memberTierIds: ['gold'],
      },
      {
        previousMemberStatus: 'paid',
        memberStatus: 'comped',
        previousMemberTierIds: ['bronze'],
        memberTierIds: ['gold'],
      },
      {
        previousMemberStatus: 'paid',
        memberStatus: 'paid',
        previousMemberTierIds: ['bronze', 'silver'],
        memberTierIds: ['silver', 'bronze'],
      },
    ] as const)('ignores nonqualifying changes %j', async function (change) {
      const withTransaction = vi.fn();
      const api = createApi({ repository: { ...repository, withTransaction } });
      await api.trigger({ ...trigger, ...change, event: 'paid_subscription_changed' });
      expect(withTransaction).not.toHaveBeenCalled();
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
      expect(domainEvents.dispatch).toHaveBeenCalledExactlyOnceWith(
        expect.any(StartAutomationsPollEvent),
      );
    });

    it('inserts no runs or steps when there are no matching automations', async function () {
      const api = createApi({ repository, domainEvents });

      await api.trigger(trigger);

      expect(runs).toHaveLength(0);
      expect(steps).toHaveLength(0);
      expect(domainEvents.dispatch).not.toHaveBeenCalled();
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
