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
  const createFakeLabs = (isAutomationsEnabled: boolean, isLeadMagnetsEnabled = true) => ({
    isSet: (flag: 'automations' | 'automationsLeadMagnets') =>
      flag === 'automations' ? isAutomationsEnabled : isLeadMagnetsEnabled,
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

  alphabeticalDescribe('fetchAndLockSteps', function () {
    const now = new Date('2026-01-02T03:04:05Z');
    const staleLockCutoff = new Date('2026-01-02T02:34:05Z');
    const nextStepReadyAt = new Date('2026-01-03T00:00:00Z');
    const transaction: TestAutomationsRepositoryConnection =
      createTestAutomationsRepository2().withConnection((connection) => connection);

    const buildLockedStep = (
      id: string,
      automationId: string,
    ): Awaited<ReturnType<Repository['findLockedRunStepsToRun']>>[number] => ({
      id,
      locked_by: 'lock-id',
      automation_run_id: `run-${id}`,
      automation_id: automationId,
      automation_status: 'active',
      member_id: `member-${id}`,
      member_email: `${id}@example.com`,
      action_id: `action-${id}`,
      automation_action_revision_id: `revision-${id}`,
      ready_at: now,
      step_attempts: 1,
      type: 'wait',
      wait_hours: 24,
    });
    const buildRule = (id: string, automationId: string) => ({
      id,
      automation_id: automationId,
      created_at: now,
      trigger_type: 'free_signup' as const,
      scope: null,
      product_id: null,
      direction: null,
    });

    let calls: string[];
    let candidateIds: string[];
    let lockedSteps: Awaited<ReturnType<Repository['findLockedRunStepsToRun']>>;
    let rules: Awaited<ReturnType<Repository['findTriggerRules']>>;
    let findClaimableRunStepIds: ReturnType<typeof vi.fn<Repository['findClaimableRunStepIds']>>;
    let lockClaimableRunSteps: ReturnType<typeof vi.fn<Repository['lockClaimableRunSteps']>>;
    let findLockedRunStepsToRun: ReturnType<typeof vi.fn<Repository['findLockedRunStepsToRun']>>;
    let findTriggerRules: ReturnType<typeof vi.fn<Repository['findTriggerRules']>>;
    let findNextClaimableRunStepReadyAt: ReturnType<
      typeof vi.fn<Repository['findNextClaimableRunStepReadyAt']>
    >;
    let repository: Repository;

    beforeEach(function () {
      vi.useFakeTimers();
      vi.setSystemTime(now);
      calls = [];
      candidateIds = ['step-a', 'step-b', 'step-c'];
      lockedSteps = [
        buildLockedStep('step-a', 'automation-1'),
        buildLockedStep('step-c', 'automation-2'),
      ];
      rules = [
        buildRule('rule-1', 'automation-1'),
        buildRule('rule-other', 'automation-other'),
        buildRule('rule-2', 'automation-1'),
      ];
      const record = (name: string) => (connection: TestAutomationsRepositoryConnection) => {
        calls.push(`${name} ${String(connection === transaction)}`);
      };
      findClaimableRunStepIds = vi.fn<Repository['findClaimableRunStepIds']>((connection) => {
        record('findClaimable')(connection);
        return candidateIds;
      });
      lockClaimableRunSteps = vi.fn<Repository['lockClaimableRunSteps']>((connection) => {
        record('lock')(connection);
      });
      findLockedRunStepsToRun = vi.fn<Repository['findLockedRunStepsToRun']>((connection) => {
        record('findLocked')(connection);
        return lockedSteps;
      });
      findTriggerRules = vi.fn<Repository['findTriggerRules']>((connection) => {
        record('findRules')(connection);
        return rules;
      });
      findNextClaimableRunStepReadyAt = vi.fn<Repository['findNextClaimableRunStepReadyAt']>(
        (connection) => {
          record('findNextReadyAt')(connection);
          return nextStepReadyAt;
        },
      );
      repository = createTestAutomationsRepository2({
        findClaimableRunStepIds,
        findLockedRunStepsToRun,
        findNextClaimableRunStepReadyAt,
        findTriggerRules,
        lockClaimableRunSteps,
        withTransaction: async (fn) => {
          calls.push('begin');
          const result = await fn(transaction);
          calls.push('commit');
          return result;
        },
      });
    });

    afterEach(function () {
      vi.useRealTimers();
    });

    it('finds, locks, and loads the claimed steps in one transaction', async function () {
      await createApi({ repository }).fetchAndLockSteps(3);

      expect(calls).toEqual([
        'begin',
        'findClaimable true',
        'lock true',
        'findLocked true',
        'findRules true',
        'findNextReadyAt true',
        'commit',
      ]);
    });

    it('claims only ready steps, taking over locks older than the stale-lock cutoff', async function () {
      await createApi({ repository }).fetchAndLockSteps(7);

      expect(findClaimableRunStepIds).toHaveBeenCalledExactlyOnceWith(transaction, {
        readyBy: now,
        staleLockCutoff,
        limit: 7,
      });
      const [[, lockedIds, lockOptions]] = lockClaimableRunSteps.mock.calls;
      expect(lockedIds).toEqual(candidateIds);
      expect(lockOptions).toEqual({
        lockedBy: expect.stringMatching(/^[0-9a-f-]{36}$/),
        now,
        staleLockCutoff,
      });
      expect(findLockedRunStepsToRun).toHaveBeenCalledExactlyOnceWith(
        transaction,
        candidateIds,
        lockOptions.lockedBy,
      );
      expect(findNextClaimableRunStepReadyAt).toHaveBeenCalledExactlyOnceWith(
        transaction,
        staleLockCutoff,
      );
    });

    it('uses a new lock ID for every claim', async function () {
      const api = createApi({ repository });

      await api.fetchAndLockSteps(3);
      await api.fetchAndLockSteps(3);

      const [first, second] = lockClaimableRunSteps.mock.calls.map(
        ([, , options]) => options.lockedBy,
      );
      expect(first).not.toEqual(second);
    });

    it("returns the locked steps with their automations' trigger rules and the next ready time", async function () {
      await expect(createApi({ repository }).fetchAndLockSteps(3)).resolves.toEqual({
        steps: [
          {
            ...lockedSteps[0],
            automation_trigger_rules: [rules[0], rules[2]],
          },
          { ...lockedSteps[1], automation_trigger_rules: [] },
        ],
        nextStepReadyAt,
      });
      expect(findTriggerRules).toHaveBeenCalledExactlyOnceWith(transaction, [
        'automation-1',
        'automation-2',
      ]);
    });

    it('returns no steps and the next ready time when nothing could be claimed', async function () {
      candidateIds = [];
      lockedSteps = [];

      await expect(createApi({ repository }).fetchAndLockSteps(3)).resolves.toEqual({
        steps: [],
        nextStepReadyAt,
      });
    });

    it.each([
      'findClaimableRunStepIds',
      'lockClaimableRunSteps',
      'findLockedRunStepsToRun',
      'findTriggerRules',
      'findNextClaimableRunStepReadyAt',
    ] as const)('propagates %s failures without committing', async function (method) {
      const failure = new Error(`${method} failed`);
      (
        {
          findClaimableRunStepIds,
          lockClaimableRunSteps,
          findLockedRunStepsToRun,
          findTriggerRules,
          findNextClaimableRunStepReadyAt,
        }[method] as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw failure;
      });

      await expect(createApi({ repository }).fetchAndLockSteps(3)).rejects.toBe(failure);
      expect(calls).not.toContain('commit');
    });
  });

  alphabeticalDescribe('finishStepAndEnqueueNext', function () {
    const HOUR_MS = 60 * 60 * 1000;
    const now = new Date('2026-01-02T03:04:05Z');
    const step = {
      id: 'step-id',
      locked_by: 'lock-id',
      action_id: 'action-id',
      automation_run_id: 'run-id',
    };
    const nextAction = {
      automation_id: 'automation-id',
      action_id: 'next-action-id',
      automation_action_revision_id: 'next-revision-id',
    };

    const transaction: TestAutomationsRepositoryConnection =
      createTestAutomationsRepository2().withConnection((connection) => connection);
    let calls: string[];
    let updated: boolean;
    let next: Awaited<ReturnType<Repository['findNextActionRevision']>>;
    let repository: Repository;
    let updateLockedRunStep: ReturnType<typeof vi.fn<Repository['updateLockedRunStep']>>;
    let findNextActionRevision: ReturnType<typeof vi.fn<Repository['findNextActionRevision']>>;
    let insertRunSteps: ReturnType<typeof vi.fn<Repository['insertRunSteps']>>;

    beforeEach(function () {
      vi.useFakeTimers();
      vi.setSystemTime(now);
      calls = [];
      updated = true;
      next = { ...nextAction, type: 'send_email' };
      updateLockedRunStep = vi.fn<Repository['updateLockedRunStep']>((connection) => {
        calls.push(`update ${String(connection === transaction)}`);
        return updated;
      });
      findNextActionRevision = vi.fn<Repository['findNextActionRevision']>((connection) => {
        calls.push(`find ${String(connection === transaction)}`);
        return next;
      });
      insertRunSteps = vi.fn<Repository['insertRunSteps']>((connection) => {
        calls.push(`insert ${String(connection === transaction)}`);
      });
      repository = createTestAutomationsRepository2({
        findNextActionRevision,
        insertRunSteps,
        updateLockedRunStep,
        withTransaction: async (fn) => {
          calls.push('begin');
          const result = await fn(transaction);
          calls.push('commit');
          return result;
        },
      });
    });

    afterEach(function () {
      vi.useRealTimers();
    });

    it('finishes the step and enqueues the next action in one transaction', async function () {
      await expect(createApi({ repository }).finishStepAndEnqueueNext(step)).resolves.toEqual(now);

      expect(calls).toEqual(['begin', 'update true', 'find true', 'insert true', 'commit']);
      expect(updateLockedRunStep).toHaveBeenCalledExactlyOnceWith(transaction, step, {
        status: 'finished',
        finished_at: now,
        updated_at: now,
      });
      expect(findNextActionRevision).toHaveBeenCalledExactlyOnceWith(transaction, {
        actionId: step.action_id,
        automationRunId: step.automation_run_id,
      });
      expect(insertRunSteps).toHaveBeenCalledExactlyOnceWith(transaction, [
        {
          id: expect.stringMatching(/^[0-9a-f]{24}$/),
          created_at: now,
          updated_at: now,
          automation_run_id: step.automation_run_id,
          automation_action_revision_id: nextAction.automation_action_revision_id,
          ready_at: now,
        },
      ]);
    });

    it.each([
      [null, 72 * HOUR_MS],
      [2500, 72 * 2500],
    ])(
      'delays a next wait action by its wait hours (fake multiplier %s)',
      async function (fakeWaitHoursMultiplier, delayMs) {
        next = { ...nextAction, type: 'wait', wait_hours: 72 };
        const readyAt = new Date(now.getTime() + delayMs);

        await expect(
          createApi({ repository, fakeWaitHoursMultiplier }).finishStepAndEnqueueNext(step),
        ).resolves.toEqual(readyAt);

        expect(insertRunSteps.mock.calls[0][1]).toEqual([
          expect.objectContaining({ created_at: now, ready_at: readyAt }),
        ]);
      },
    );

    it('does not look for or enqueue a next step when the runner lost the lock', async function () {
      updated = false;

      await expect(createApi({ repository }).finishStepAndEnqueueNext(step)).resolves.toBeNull();

      expect(calls).toEqual(['begin', 'update true', 'commit']);
    });

    it('finishes the step without enqueueing when there is no next action', async function () {
      next = null;

      await expect(createApi({ repository }).finishStepAndEnqueueNext(step)).resolves.toBeNull();

      expect(calls).toEqual(['begin', 'update true', 'find true', 'commit']);
    });

    it.each(['updateLockedRunStep', 'findNextActionRevision', 'insertRunSteps'] as const)(
      'propagates %s failures without committing',
      async function (method) {
        const failure = new Error(`${method} failed`);
        ({ updateLockedRunStep, findNextActionRevision, insertRunSteps })[
          method
        ].mockImplementation(() => {
          throw failure;
        });

        await expect(createApi({ repository }).finishStepAndEnqueueNext(step)).rejects.toBe(
          failure,
        );
        expect(calls).not.toContain('commit');
      },
    );
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

  alphabeticalDescribe('markStepTerminal', function () {
    const now = new Date('2026-01-02T03:04:05Z');
    const step = { id: 'step-id', locked_by: 'lock-id' };

    beforeEach(function () {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(function () {
      vi.useRealTimers();
    });

    it.each([true, false])(
      'finishes the locked step with its status and returns %s when the repository does',
      async function (updated) {
        const updateLockedRunStep = vi.fn<Repository['updateLockedRunStep']>(() => updated);
        const repository = createTestAutomationsRepository2({ updateLockedRunStep });

        await expect(
          createApi({ repository }).markStepTerminal(step, 'member unsubscribed'),
        ).resolves.toBe(updated);

        expect(updateLockedRunStep).toHaveBeenCalledOnce();
        const [, lockedStep, changes] = updateLockedRunStep.mock.calls[0];
        expect(lockedStep).toEqual(step);
        // Completion only: no started_at or ready_at changes.
        expect(changes).toStrictEqual({
          status: 'member unsubscribed',
          finished_at: now,
          updated_at: now,
        });
      },
    );
  });

  alphabeticalDescribe('notify', function () {
    type FirstAction = Awaited<ReturnType<Repository['findFirstActionRevisions']>>[number];

    let repository: ReturnType<typeof createTestAutomationsRepository2>;
    let domainEvents: { dispatch: ReturnType<typeof vi.fn<(event: unknown) => unknown>> };
    let event: Extract<
      Parameters<ReturnType<typeof createApi>['notify']>[0],
      { eventName: 'membership_started' }
    >;
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
        memberId: ObjectId().toHexString(),
        memberStatus: 'free',
        previousMemberStatus: null,
        memberTierIds: [],
      };

      repository = createTestAutomationsRepository2({
        fetchAndLockMembers: () => [{ id: event.memberId, email: 'stored@example.com' }],
        findAutomationMemberEnrollments: (_connection, automationIds, memberIds) =>
          runs.filter(
            (run) => automationIds.includes(run.automation_id) && memberIds.includes(run.member_id),
          ),
        findFirstActionRevisions: () => firstActions,
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
      await api.notify({
        eventName: 'label_added',
        labelId: 'label',
        memberIds: ['member'],
      });

      expect(withTransaction).not.toHaveBeenCalled();
      expect(domainEvents.dispatch).not.toHaveBeenCalled();
    });

    it('ignores label additions before opening a transaction when lead magnets are disabled', async function () {
      const withTransaction = vi.fn();
      const api = createApi({
        labs: createFakeLabs(true, false),
        repository: { ...repository, withTransaction },
        domainEvents,
      });

      await api.notify({ eventName: 'label_added', labelId: 'label', memberIds: ['member'] });

      expect(withTransaction).not.toHaveBeenCalled();
      expect(domainEvents.dispatch).not.toHaveBeenCalled();
    });

    it('still processes membership events when only lead magnets are disabled', async function () {
      const withTransaction = vi.fn().mockResolvedValue(false);
      const api = createApi({
        labs: createFakeLabs(true, false),
        repository: { ...repository, withTransaction },
      });

      await api.notify(event);
      await api.notify({
        ...event,
        eventName: 'paid_subscription_changed',
        previousMemberStatus: 'paid',
        previousMemberTierIds: ['basic'],
      });

      expect(withTransaction).toHaveBeenCalledTimes(2);
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

    it('locks the members before any other repository operation', async function () {
      firstActions = [createFirstAction()];
      const findFirstActionRevisions = vi.fn(repository.findFirstActionRevisions);
      const fetchAndLockMembers = vi.fn(repository.fetchAndLockMembers);
      const findAutomationMemberEnrollments = vi.fn(repository.findAutomationMemberEnrollments);
      const insertRuns = vi.fn();
      const insertRunSteps = vi.fn();
      const api = createApi({
        repository: {
          ...repository,
          findAutomationMemberEnrollments,
          fetchAndLockMembers,
          findFirstActionRevisions,
          insertRuns,
          insertRunSteps,
        },
        domainEvents,
      });
      await api.notify(event);
      expect(fetchAndLockMembers).toHaveBeenCalledBefore(findFirstActionRevisions);
      expect(fetchAndLockMembers).toHaveBeenCalledBefore(findAutomationMemberEnrollments);
      expect(fetchAndLockMembers).toHaveBeenCalledBefore(insertRuns);
      expect(fetchAndLockMembers).toHaveBeenCalledBefore(insertRunSteps);
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
          member_email: 'stored@example.com',
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

    it.each(['membership_started', 'paid_subscription_changed'] as const)(
      'reads the member email for %s events',
      async function (eventName) {
        firstActions = [createFirstAction()];
        const api = createApi({ repository, domainEvents });
        await api.notify({
          ...event,
          eventName,
          previousMemberStatus: 'paid',
          previousMemberTierIds: ['previous-tier'],
        });
        expect(runs).toEqual([expect.objectContaining({ member_email: 'stored@example.com' })]);
      },
    );

    it.each(['member', 'admin', 'api', 'import', 'system'] as const)(
      'enrolls labeled members from %s events',
      async function (source) {
        const members = [
          { id: 'member-1', email: 'first@example.com' },
          { id: 'member-2', email: 'second@example.com' },
        ];
        const wait = createFirstAction();
        const email: FirstAction = { ...createFirstAction(), type: 'send_email' };
        firstActions = [wait, email];
        const findAutomationMemberEnrollments = vi.fn(repository.findAutomationMemberEnrollments);
        const findFirstActionRevisions = vi.fn(() => firstActions);
        const api = createApi({
          repository: {
            ...repository,
            findAutomationMemberEnrollments,
            fetchAndLockMembers: () => members,
            findFirstActionRevisions,
          },
          domainEvents,
        });

        await api.notify({
          eventName: 'label_added',
          labelId: 'label',
          memberIds: members.map(({ id }) => id),
        });

        expect(findAutomationMemberEnrollments).toHaveBeenCalledExactlyOnceWith(
          expect.anything(),
          firstActions.map((action) => action.automation_id),
          ['member-1', 'member-2'],
        );
        expect(findFirstActionRevisions).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
          eventName: 'label_added',
          labelId: 'label',
        });
        expect(runs).toEqual(
          members.flatMap((member) =>
            firstActions.map((action) => ({
              id: expect.any(String),
              automation_id: action.automation_id,
              member_id: member.id,
              member_email: member.email,
              created_at: now,
              updated_at: now,
            })),
          ),
        );
        expect(steps).toEqual(
          runs.map((run) => ({
            id: expect.any(String),
            automation_run_id: run.id,
            automation_action_revision_id:
              run.automation_id === wait.automation_id
                ? wait.automation_action_revision_id
                : email.automation_action_revision_id,
            created_at: now,
            updated_at: now,
            ready_at:
              run.automation_id === wait.automation_id ? new Date('2026-01-02T05:04:05Z') : now,
          })),
        );
        expect(domainEvents.dispatch).toHaveBeenCalledExactlyOnceWith(
          expect.any(StartAutomationsPollEvent),
        );
      },
    );

    it('does nothing for an empty label event', async function () {
      const withTransaction = vi.fn(() => {
        throw new Error('withTransaction should not be called');
      });
      const api = createApi({
        repository: { ...repository, withTransaction },
        domainEvents,
      });
      await api.notify({
        eventName: 'label_added',
        labelId: 'label',
        memberIds: [],
      });

      expect(withTransaction).not.toHaveBeenCalled();
      expect(domainEvents.dispatch).not.toHaveBeenCalled();
    });

    it('does not trigger when label has no matching automations', async function () {
      firstActions = [];
      const api = createApi({
        repository: {
          ...repository,
          fetchAndLockMembers: () => [{ id: 'member', email: 'member@example.com' }],
        },
        domainEvents,
      });
      await api.notify({
        eventName: 'label_added',
        labelId: 'label',
        memberIds: ['member'],
      });
      expect(runs).toEqual([]);
      expect(steps).toEqual([]);
      expect(domainEvents.dispatch).not.toHaveBeenCalled();
    });

    it('does not trigger when label members are missing', async function () {
      firstActions = [createFirstAction()];
      const api = createApi({
        repository: { ...repository, fetchAndLockMembers: () => [] },
        domainEvents,
      });
      await api.notify({
        eventName: 'label_added',
        labelId: 'label',
        memberIds: ['member'],
      });
      expect(runs).toEqual([]);
      expect(steps).toEqual([]);
      expect(domainEvents.dispatch).not.toHaveBeenCalled();
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
      'fetchAndLockMembers',
      'findAutomationMemberEnrollments',
      'findFirstActionRevisions',
      'insertRunSteps',
      'insertRuns',
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

  alphabeticalDescribe('recordEmailSent', function () {
    const now = new Date('2026-01-02T03:04:05Z');
    const options = {
      automationActionRevisionId: 'revision-id',
      automationRunStepId: 'step-id',
      mailgunMessageId: 'mailgun-message-id',
      memberEmail: 'member@example.com',
      memberId: 'member-id',
      memberName: 'Test Member',
      memberUuid: '00000000-0000-4000-8000-000000000001',
      trackClicks: true,
      trackOpens: false,
    };

    let repository: ReturnType<typeof createTestAutomationsRepository2>;
    let calls: string[];

    beforeEach(function () {
      vi.useFakeTimers();
      vi.setSystemTime(now);
      calls = [];
      repository = createTestAutomationsRepository2({
        incrementEmailSentCount: vi.fn<Repository['incrementEmailSentCount']>(() => {
          calls.push('incrementEmailSentCount');
        }),
        insertEmailRecipient: vi.fn<Repository['insertEmailRecipient']>(() => {
          calls.push('insertEmailRecipient');
        }),
        withTransaction: async (fn) => {
          calls.push('begin');
          const result = await createTestAutomationsRepository2().withTransaction(fn);
          calls.push('commit');
          return result;
        },
      });
    });

    afterEach(function () {
      vi.useRealTimers();
    });

    it('counts the send before recording its recipient in one transaction', async function () {
      await createApi({ repository }).recordEmailSent(options);

      expect(calls).toEqual(['begin', 'incrementEmailSentCount', 'insertEmailRecipient', 'commit']);
      const [connection, revisionId] = vi.mocked(repository.incrementEmailSentCount).mock.calls[0];
      expect(revisionId).toBe('revision-id');
      const [insertConnection, recipient] = vi.mocked(repository.insertEmailRecipient).mock
        .calls[0];
      expect(insertConnection).toBe(connection);
      expect(recipient).toEqual({
        id: expect.any(String),
        created_at: now,
        updated_at: now,
        member_id: 'member-id',
        member_uuid: '00000000-0000-4000-8000-000000000001',
        member_email: 'member@example.com',
        member_name: 'Test Member',
        automation_action_revision_id: 'revision-id',
        automation_run_step_id: 'step-id',
        mailgun_message_id: 'mailgun-message-id',
        track_clicks: true,
        track_opens: false,
      });
      expect(ObjectId.isValid(recipient.id)).toBe(true);
    });

    it('waits for the sent count update before inserting the recipient', async function () {
      const count = Promise.withResolvers<void>();
      const countStarted = Promise.withResolvers<void>();
      vi.mocked(repository.incrementEmailSentCount).mockImplementation(() => {
        countStarted.resolve();
        return count.promise;
      });

      const pending = createApi({ repository }).recordEmailSent(options);
      try {
        await countStarted.promise;
        await vi.advanceTimersByTimeAsync(0);
        expect(repository.insertEmailRecipient).not.toHaveBeenCalled();
      } finally {
        count.resolve();
      }
      await pending;
      expect(repository.insertEmailRecipient).toHaveBeenCalledOnce();
    });

    it('records recipients without a Mailgun message ID or member name', async function () {
      const { mailgunMessageId: _mailgunMessageId, ...withoutMailgunId } = options;

      await createApi({ repository }).recordEmailSent({ ...withoutMailgunId, memberName: null });

      const recipient = vi.mocked(repository.insertEmailRecipient).mock.calls[0][1];
      expect(recipient).not.toHaveProperty('mailgun_message_id');
      expect(recipient.member_name).toBeNull();
    });

    it('rejects when the recipient cannot be recorded', async function () {
      const failure = new Error('Could not record recipient');
      vi.mocked(repository.insertEmailRecipient).mockRejectedValue(failure);

      await expect(createApi({ repository }).recordEmailSent(options)).rejects.toBe(failure);
      expect(calls).not.toContain('commit');
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

  alphabeticalDescribe('retryStep', function () {
    const now = new Date('2026-01-02T03:04:05Z');
    const retryAt = new Date('2026-01-02T03:09:05Z');
    const step = { id: 'step-id', locked_by: 'lock-id' };
    const transaction: TestAutomationsRepositoryConnection =
      createTestAutomationsRepository2().withConnection((connection) => connection);

    let isActive: boolean;
    let updated: boolean;
    let calls: string[];
    let repository: Repository;
    let isAutomationActiveForRunStep: ReturnType<
      typeof vi.fn<Repository['isAutomationActiveForRunStep']>
    >;
    let updateLockedRunStep: ReturnType<typeof vi.fn<Repository['updateLockedRunStep']>>;

    beforeEach(function () {
      vi.useFakeTimers();
      vi.setSystemTime(now);
      isActive = true;
      updated = true;
      calls = [];
      isAutomationActiveForRunStep = vi.fn<Repository['isAutomationActiveForRunStep']>(
        (connection) => {
          calls.push(`isActive ${String(connection === transaction)}`);
          return isActive;
        },
      );
      updateLockedRunStep = vi.fn<Repository['updateLockedRunStep']>((connection) => {
        calls.push(`update ${String(connection === transaction)}`);
        return updated;
      });
      repository = createTestAutomationsRepository2({
        isAutomationActiveForRunStep,
        updateLockedRunStep,
        withTransaction: async (fn) => {
          calls.push('begin');
          const result = await fn(transaction);
          calls.push('commit');
          return result;
        },
      });
    });

    afterEach(function () {
      vi.useRealTimers();
    });

    it('requeues the step in one transaction when its automation is active', async function () {
      await expect(createApi({ repository }).retryStep(step, retryAt)).resolves.toBe('requeued');

      expect(calls).toEqual(['begin', 'isActive true', 'update true', 'commit']);
      expect(isAutomationActiveForRunStep).toHaveBeenCalledExactlyOnceWith(transaction, step.id);
      expect(updateLockedRunStep).toHaveBeenCalledExactlyOnceWith(transaction, step, {
        status: 'pending',
        started_at: null,
        finished_at: null,
        ready_at: retryAt,
        updated_at: now,
      });
    });

    it('marks the step "automation disabled" instead when its automation is no longer active', async function () {
      isActive = false;

      await expect(createApi({ repository }).retryStep(step, retryAt)).resolves.toBe(
        'automation disabled',
      );

      expect(calls).toEqual(['begin', 'isActive true', 'update true', 'commit']);
      // Completion only: no started_at or ready_at changes.
      expect(updateLockedRunStep).toHaveBeenCalledExactlyOnceWith(transaction, step, {
        status: 'automation disabled',
        finished_at: now,
        updated_at: now,
      });
    });

    it.each([true, false])(
      'reports a lost lock when the step cannot be updated (automation active: %s)',
      async function (active) {
        isActive = active;
        updated = false;

        await expect(createApi({ repository }).retryStep(step, retryAt)).resolves.toBe('lock lost');
      },
    );
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

    it('waits for revision locks before locking recipients', async function () {
      let releaseRevisions!: () => void;
      vi.mocked(repository.lockActionRevisions).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            releaseRevisions = resolve;
          }),
      );

      const pending = track([
        ['recipient-1', { automationActionRevisionId: 'revision-1', openedAt }],
      ]);
      try {
        await new Promise<void>((resolve) => {
          setImmediate(resolve);
        });
        expect(repository.lockActionRevisions).toHaveBeenCalledOnce();
        expect(repository.lockNotYetOpenedEmailRecipients).not.toHaveBeenCalled();
      } finally {
        releaseRevisions();
        await pending;
      }
      expect(repository.lockNotYetOpenedEmailRecipients).toHaveBeenCalledOnce();
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
