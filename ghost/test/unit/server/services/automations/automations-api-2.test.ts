import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import { noop } from 'lodash';
import { createAutomationsApi2 } from '../../../../../core/server/services/automations/automations-api-2';
import type {
  AutomationsRepository2,
  AutomatedEmailRecipientTrackingData,
  RunStepToInsert,
  RunToInsert,
} from '../../../../../core/server/services/automations/automations-repository-2';
import { StartAutomationsPollEvent } from '../../../../../core/server/services/automations/events/start-automations-poll-event';
import {
  createTestAutomationsRepository2,
  type TestAutomationsRepositoryConnection,
} from './test-automations-repository-2';
import { alphabeticalDescribe } from '../../../../utils/alphabetical-describe';

type Repository = AutomationsRepository2<TestAutomationsRepositoryConnection>;

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

  alphabeticalDescribe('getNumberOfAutomations', function () {
    it('returns the number of automations', async function () {
      const repository = createTestAutomationsRepository2({
        getNumberOfAutomations: () => 123,
      });
      const api = createApi({ repository });

      await expect(api.getNumberOfAutomations()).resolves.toBe(123);
    });
  });

  alphabeticalDescribe('notify', function () {
    type FirstAction = Awaited<ReturnType<Repository['findFirstActionRevisions']>>[number];

    let repository: ReturnType<typeof createTestAutomationsRepository2>;
    let domainEvents: { dispatch: ReturnType<typeof vi.fn<(event: unknown) => unknown>> };
    let event: Parameters<ReturnType<typeof createApi>['notify']>[0];
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
      event = {
        eventName: 'membership_started',
        source: 'member',
        memberEmail: 'member@example.com',
        memberId: ObjectId().toHexString(),
        memberStatus: 'free',
        previousMemberStatus: null,
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

    it('fails if called with an unexpected `eventName`', async function () {
      const withTransaction = vi.fn();
      const api = createApi({ repository: { ...repository, withTransaction } });

      const eventNames = [undefined, 'invalid', 'membership_ended', 'membership_did_start'];
      await Promise.all(
        eventNames.map(async (eventName) => {
          await expect(() =>
            api.notify({
              ...event,
              eventName: eventName as any,
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

      await api.notify(event);
      await api.notify({
        ...event,
        eventName: 'paid_subscription_changed',
        previousMemberStatus: 'paid',
        previousMemberTierIds: ['basic'],
      });

      expect(withTransaction).not.toHaveBeenCalled();
      expect(domainEvents.dispatch).not.toHaveBeenCalled();
    });

    it.each(['admin', 'api', 'import', 'system'] as const)(
      'does nothing for %s signup sources',
      async function (source) {
        const withTransaction = vi.fn();
        const api = createApi({ repository: { ...repository, withTransaction } });

        await api.notify({ ...event, source });
        await api.notify({
          ...event,
          eventName: 'paid_subscription_changed',
          source,
          previousMemberStatus: 'paid',
          previousMemberTierIds: ['basic'],
        });

        expect(withTransaction).not.toHaveBeenCalled();
        expect(domainEvents.dispatch).not.toHaveBeenCalled();
      },
    );

    it('does nothing for comped signups and gift-to-paid transitions', async function () {
      const withTransaction = vi.fn();
      const api = createApi({ repository: { ...repository, withTransaction } });

      await api.notify({ ...event, memberStatus: 'comped' });
      await api.notify({ ...event, memberStatus: 'paid', previousMemberStatus: 'gift' });

      expect(withTransaction).not.toHaveBeenCalled();
      expect(domainEvents.dispatch).not.toHaveBeenCalled();
    });

    it('does not start tier-change automations for unchanged tiers, free memberships, or changes to or from complimentary memberships', async function () {
      const withTransaction = vi.fn();
      const api = createApi({ repository: { ...repository, withTransaction } });

      const changed = {
        ...event,
        eventName: 'paid_subscription_changed' as const,
        previousMemberStatus: 'paid' as const,
        previousMemberTierIds: ['basic'],
      };
      await api.notify({ ...changed, memberTierIds: ['basic'] });
      await api.notify({ ...changed, previousMemberStatus: 'free' });
      await api.notify({ ...changed, previousMemberStatus: 'comped' });
      await api.notify({ ...changed, memberStatus: 'comped' });

      expect(withTransaction).not.toHaveBeenCalled();
      expect(domainEvents.dispatch).not.toHaveBeenCalled();
    });

    it('matches gift signups against paid automations', async function () {
      const findFirstActionRevisions = vi.fn().mockReturnValue([]);
      const api = createApi({ repository: { ...repository, findFirstActionRevisions } });

      await api.notify({ ...event, memberStatus: 'gift', memberTierIds: ['tier'] });

      expect(findFirstActionRevisions).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
        eventName: 'membership_started',
        memberStatus: 'paid',
        memberTierIds: ['tier'],
      });
    });

    it('treats gift memberships like paid memberships when signing up or changing tiers', async function () {
      const findFirstActionRevisions = vi.fn(() => []);
      const api = createApi({ repository: { ...repository, findFirstActionRevisions } });
      await api.notify({
        ...event,
        eventName: 'membership_started',
        memberStatus: 'gift',
        previousMemberStatus: null,
      });
      expect(findFirstActionRevisions).toHaveBeenLastCalledWith(expect.anything(), {
        eventName: 'membership_started',
        memberStatus: 'paid',
        memberTierIds: [],
      });
      await api.notify({
        ...event,
        eventName: 'paid_subscription_changed',
        memberStatus: 'gift',
        previousMemberStatus: 'gift',
        previousMemberTierIds: ['basic'],
        memberTierIds: ['premium'],
      });
      expect(findFirstActionRevisions).toHaveBeenLastCalledWith(expect.anything(), {
        eventName: 'paid_subscription_changed',
        memberStatus: 'paid',
        previousMemberTierIds: ['basic'],
        memberTierIds: ['premium'],
      });
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

      await api.notify(event);

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

      await api.notify(event);

      expect(runs).toEqual(
        firstActions.map((action) => ({
          id: expect.any(String),
          automation_id: action.automation_id,
          member_id: event.memberId,
          member_email: event.memberEmail,
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

        await api.notify({ ...event, memberStatus, memberTierIds });

        expect(findFirstActionRevisions).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
          eventName: 'membership_started',
          memberStatus,
          memberTierIds,
        });
      },
    );

    it('skips signup automations the member has already entered while enrolling in new ones', async function () {
      const entered = createFirstAction();
      const available = createFirstAction();
      firstActions = [entered, available];
      runs = [
        {
          id: ObjectId().toHexString(),
          automation_id: entered.automation_id,
          member_id: event.memberId,
        },
      ];
      const api = createApi({ repository, domainEvents });

      await api.notify(event);

      expect(runs).toHaveLength(2);
      expect(runs[1]?.automation_id).toBe(available.automation_id);
      expect(steps).toHaveLength(1);
      expect(steps[0]?.automation_action_revision_id).toBe(available.automation_action_revision_id);
      expect(steps[0]?.automation_run_id).toBe(runs[1]?.id);
      expect(domainEvents.dispatch).toHaveBeenCalledExactlyOnceWith(
        expect.any(StartAutomationsPollEvent),
      );
    });

    it('skips "paid subscription changed" automations when the member has already entered that automation', async function () {
      firstActions.push(createFirstAction());
      const findFirstActionRevisions = vi.fn(() => firstActions);
      const api = createApi({
        repository: { ...repository, findFirstActionRevisions },
        domainEvents,
        labs: { isSet: (flag: string) => flag === 'automations' },
      });
      const changed = {
        ...event,
        eventName: 'paid_subscription_changed' as const,
        previousMemberStatus: 'paid' as const,
        previousMemberTierIds: ['basic'],
        memberTierIds: ['premium'],
        memberStatus: 'paid' as const,
      };
      await api.notify(changed);
      await api.notify(changed);
      expect(findFirstActionRevisions).toHaveBeenLastCalledWith(expect.anything(), {
        eventName: changed.eventName,
        memberStatus: changed.memberStatus,
        memberTierIds: changed.memberTierIds,
        previousMemberTierIds: changed.previousMemberTierIds,
      });
      expect(runs).toHaveLength(1);
      expect(steps).toHaveLength(1);
    });

    it('inserts no runs or steps when there are no matching automations', async function () {
      const api = createApi({ repository, domainEvents });

      await api.notify(event);

      expect(runs).toHaveLength(0);
      expect(steps).toHaveLength(0);
      expect(domainEvents.dispatch).not.toHaveBeenCalled();
    });

    it('applies the fake wait-hours multiplier when scheduling a wait action', async function () {
      firstActions = [createFirstAction()];
      const api = createApi({ repository, domainEvents, fakeWaitHoursMultiplier: 100 });

      await api.notify(event);

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

      await expect(api.notify(event)).rejects.toBe(failure);

      expect(domainEvents.dispatch).not.toHaveBeenCalled();
    });
  });

  alphabeticalDescribe('requestPoll', function () {
    it('dispatches a "start automations poll" event', function () {
      const domainEvents = { dispatch: vi.fn<(event: unknown) => unknown>() };
      const api = createApi({ domainEvents });

      api.requestPoll();

      expect(domainEvents.dispatch).toHaveBeenCalledExactlyOnceWith(
        expect.any(StartAutomationsPollEvent),
      );
    });
  });

  alphabeticalDescribe('trackEmailClicked', function () {
    const click = {
      automationActionRevisionId: 'revision-id',
      automationRunStepId: 'step-id',
      memberId: 'member-id',
      clickedAt: new Date('2026-01-02T03:04:05Z'),
    };
    let repository: ReturnType<typeof createTestAutomationsRepository2>;

    beforeEach(function () {
      repository = createTestAutomationsRepository2({
        lockActionRevisions: noop,
        findEmailRecipientForClick: () => ({ id: 'recipient-id', clicked_at: null }),
        setEmailRecipientClickedAt: vi.fn().mockReturnValue(true),
        incrementEmailClickedCount: vi.fn(),
      });
    });

    const trackClick = () =>
      repository.withConnection((connection) =>
        createApi({ repository }).trackEmailClicked(click, { connection }),
      );

    it('records when a member first clicks an email and increases its click count', async function () {
      await trackClick();

      expect(repository.setEmailRecipientClickedAt).toHaveBeenCalledExactlyOnceWith(
        expect.anything(),
        'recipient-id',
        click.clickedAt,
      );
      expect(repository.incrementEmailClickedCount).toHaveBeenCalledExactlyOnceWith(
        expect.anything(),
        click.automationActionRevisionId,
      );
    });

    it('locks the email before looking up or recording its click', async function () {
      const lock = vi.spyOn(repository, 'lockActionRevisions');
      const find = vi.spyOn(repository, 'findEmailRecipientForClick');
      const save = vi.spyOn(repository, 'setEmailRecipientClickedAt');
      const increment = vi.spyOn(repository, 'incrementEmailClickedCount');

      await trackClick();

      expect(lock).toHaveBeenCalledOnce();
      for (const operation of [find, save, increment]) {
        expect(operation).toHaveBeenCalledOnce();
        expect(lock.mock.invocationCallOrder[0]).toBeLessThan(
          operation.mock.invocationCallOrder[0],
        );
      }
    });

    it('ignores clicks when no matching email has click tracking enabled', async function () {
      repository.findEmailRecipientForClick = () => undefined;

      await trackClick();

      expect(repository.setEmailRecipientClickedAt).not.toHaveBeenCalled();
      expect(repository.incrementEmailClickedCount).not.toHaveBeenCalled();
    });

    it('keeps the first click time and count when a member clicks again', async function () {
      repository.findEmailRecipientForClick = () => ({
        id: 'recipient-id',
        clicked_at: click.clickedAt,
      });

      await trackClick();

      expect(repository.setEmailRecipientClickedAt).not.toHaveBeenCalled();
      expect(repository.incrementEmailClickedCount).not.toHaveBeenCalled();
    });

    it('does not count a click already recorded by another request', async function () {
      vi.mocked(repository.setEmailRecipientClickedAt).mockReturnValue(false);

      await trackClick();

      expect(repository.incrementEmailClickedCount).not.toHaveBeenCalled();
    });

    it('reports an error when the click cannot be saved', async function () {
      const error = new Error('Could not save email click');
      vi.mocked(repository.setEmailRecipientClickedAt).mockRejectedValue(error);

      await expect(trackClick()).rejects.toBe(error);

      expect(repository.incrementEmailClickedCount).not.toHaveBeenCalled();
    });
  });

  alphabeticalDescribe('trackEmailDeliveredAndOpened', function () {
    const deliveredAt = new Date('2026-01-01T00:00:00Z');
    const openedAt = new Date('2026-01-02T00:00:00Z');

    let repository: ReturnType<typeof createTestAutomationsRepository2>;
    let api: ReturnType<typeof createApi>;

    beforeEach(function () {
      repository = createTestAutomationsRepository2({
        incrementEmailOpenedCount: vi.fn<Repository['incrementEmailOpenedCount']>(),
        lockActionRevisions: vi.fn<Repository['lockActionRevisions']>(),
        lockNotYetOpenedEmailRecipients: vi.fn<Repository['lockNotYetOpenedEmailRecipients']>(
          () => new Set(['recipient-1', 'recipient-2', 'recipient-3']),
        ),
        setEmailRecipientDeliveredAndOpenedAt:
          vi.fn<Repository['setEmailRecipientDeliveredAndOpenedAt']>(),
      });
      vi.spyOn(repository, 'withTransaction');
      api = createApi({ repository });
    });

    const track = (entries: Array<[string, AutomatedEmailRecipientTrackingData]>) =>
      api.trackEmailDeliveredAndOpened(new Map(entries));

    it('does nothing for an empty batch', async function () {
      await track([]);

      expect(repository.withTransaction).not.toHaveBeenCalled();
    });

    it('tracks deliveries and opens', async function () {
      await track([
        ['recipient-1', { automationActionRevisionId: 'revision-1', deliveredAt }],
        ['recipient-2', { automationActionRevisionId: 'revision-2', openedAt }],
        ['recipient-3', { automationActionRevisionId: 'revision-1', deliveredAt, openedAt }],
      ]);

      expect(repository.withTransaction).toHaveBeenCalledOnce();
      expect(repository.setEmailRecipientDeliveredAndOpenedAt).toHaveBeenCalledTimes(3);
      const connection = vi.mocked(repository.lockActionRevisions).mock.calls[0][0];
      expect(repository.lockNotYetOpenedEmailRecipients).toHaveBeenCalledWith(connection, [
        'recipient-2',
        'recipient-3',
      ]);
      expect(repository.setEmailRecipientDeliveredAndOpenedAt).toHaveBeenNthCalledWith(
        1,
        connection,
        'recipient-1',
        { deliveredAt, openedAt: undefined },
      );
      expect(repository.setEmailRecipientDeliveredAndOpenedAt).toHaveBeenNthCalledWith(
        2,
        connection,
        'recipient-2',
        { deliveredAt: undefined, openedAt },
      );
      expect(repository.setEmailRecipientDeliveredAndOpenedAt).toHaveBeenNthCalledWith(
        3,
        connection,
        'recipient-3',
        { deliveredAt, openedAt },
      );
      expect(repository.incrementEmailOpenedCount).toHaveBeenCalledWith(
        connection,
        'revision-1',
        1,
      );
      expect(repository.incrementEmailOpenedCount).toHaveBeenCalledWith(
        connection,
        'revision-2',
        1,
      );
    });

    it('counts first opens for each email version', async function () {
      await track([
        ['recipient-1', { automationActionRevisionId: 'revision-1', openedAt }],
        ['recipient-2', { automationActionRevisionId: 'revision-2', openedAt }],
        ['recipient-3', { automationActionRevisionId: 'revision-1', openedAt }],
      ]);

      const [connection, revisions] = vi.mocked(repository.lockActionRevisions).mock.calls[0];
      expect([...revisions]).toEqual(['revision-1', 'revision-2']);
      expect(repository.incrementEmailOpenedCount).toHaveBeenCalledTimes(2);
      expect(repository.incrementEmailOpenedCount).toHaveBeenCalledWith(
        connection,
        'revision-1',
        2,
      );
      expect(repository.incrementEmailOpenedCount).toHaveBeenCalledWith(
        connection,
        'revision-2',
        1,
      );
    });

    it('does not count already-opened or unknown recipients', async function () {
      vi.mocked(repository.lockNotYetOpenedEmailRecipients).mockReturnValue(new Set());

      await track([
        ['already-opened', { automationActionRevisionId: 'revision-1', openedAt }],
        ['unknown', { automationActionRevisionId: 'revision-2', openedAt }],
      ]);

      expect(repository.setEmailRecipientDeliveredAndOpenedAt).toHaveBeenCalledTimes(2);
      expect(repository.incrementEmailOpenedCount).not.toHaveBeenCalled();
    });

    it('does not count deliveries as opens', async function () {
      await track([['recipient-1', { automationActionRevisionId: 'revision-1', deliveredAt }]]);

      expect(repository.incrementEmailOpenedCount).not.toHaveBeenCalled();
    });

    it('does not lock delivery-only events', async function () {
      await track([['recipient-1', { automationActionRevisionId: 'revision-1', deliveredAt }]]);

      expect([...vi.mocked(repository.lockActionRevisions).mock.calls[0][1]]).toEqual([]);
      expect(repository.lockNotYetOpenedEmailRecipients).toHaveBeenCalledWith(
        expect.anything(),
        [],
      );
    });

    it('passes events without timestamps to the repository without counting opens', async function () {
      await track([['recipient-1', { automationActionRevisionId: 'revision-1' }]]);

      expect(repository.setEmailRecipientDeliveredAndOpenedAt).toHaveBeenCalledWith(
        expect.anything(),
        'recipient-1',
        { deliveredAt: undefined, openedAt: undefined },
      );
      expect(repository.incrementEmailOpenedCount).not.toHaveBeenCalled();
    });
  });
});
