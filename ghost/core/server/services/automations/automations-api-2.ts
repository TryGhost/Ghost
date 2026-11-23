import type DomainEvents from '@tryghost/domain-events';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import ObjectId from 'bson-objectid';
import { randomUUID } from 'node:crypto';
import type { ReadonlyDeep } from 'type-fest';
import { AutoFillingMap } from '../../lib/auto-filling-map';
import type { AutomationStepTerminalStatus } from './automation-step-status';
import type {
  AutomationsRepository2,
  AutomatedEmailRecipientTrackingData,
  EmailRecipientToInsert,
  LockedRunStep,
  LockedRunStepToRun,
  RunStepToInsert,
  RunToInsert,
  TrackEmailClickedOptions,
} from './automations-repository-2';
import { StartAutomationsPollEvent } from './events/start-automations-poll-event';
import { getStaleLockCutoff } from './stale-lock-cutoff';
import type { AutomationTriggerRule } from './trigger-rules';
import { getReadyAtForAction } from './util/get-ready-at-for-action';

type Labs = { isSet(key: 'automations' | 'automationsLeadMagnets'): boolean };

type MemberStatus = 'free' | 'paid' | 'gift' | 'comped';

export type RecordEmailSentOptions = Readonly<{
  automationActionRevisionId: string;
  automationRunStepId: string;
  mailgunMessageId?: string;
  memberEmail: string;
  memberId: string;
  memberName: string | null;
  memberUuid: string;
  trackClicks: boolean;
  trackOpens: boolean;
}>;

/** A step this runner claimed, with what the poller needs to run it. */
export type AutomationStepToRun = LockedRunStepToRun &
  ReadonlyDeep<{ automation_trigger_rules: AutomationTriggerRule[] }>;

/**
 * What happened to a step that was retried:
 *
 * - `requeued`: it is pending again and will be retried.
 * - `automation disabled`: its automation is no longer active, so it was
 *   marked terminal instead.
 * - `lock lost`: another runner reclaimed it or it already ended, so it was
 *   left alone.
 */
export type RetryStepResult = 'requeued' | 'automation disabled' | 'lock lost';

const hashEnrollment = (
  enrollment: Readonly<Pick<RunToInsert, 'automation_id' | 'member_id'>>,
): string => `${enrollment.automation_id}-${enrollment.member_id}`;

/**
 * A collection of various automations operations.
 *
 * Logic should primarily live here, not in repositories.
 *
 * NOTE: `createAutomationsApi2` will soon replace the existing automations API. See NY-1704.
 */
export const createAutomationsApi2 = <RepositoryTransaction>({
  domainEvents,
  fakeWaitHoursMultiplier,
  labs,
  repository,
}: Readonly<{
  domainEvents: Pick<typeof DomainEvents, 'dispatch'>;
  fakeWaitHoursMultiplier: null | number;
  labs: Labs;
  repository: AutomationsRepository2<RepositoryTransaction>;
}>) => {
  const requestPoll = (): void => {
    domainEvents.dispatch(StartAutomationsPollEvent.create());
  };

  const markLockedStepTerminal = async (
    connection: RepositoryTransaction,
    step: LockedRunStep,
    status: AutomationStepTerminalStatus,
  ): Promise<boolean> => {
    const now = new Date();
    return await repository.updateLockedRunStep(connection, step, {
      status,
      finished_at: now,
      updated_at: now,
    });
  };

  return {
    /**
     * Claim up to `limit` ready steps and return them, with the earliest ready
     * time of the claimable steps left, if any.
     *
     * Concurrent callers, maybe in different processes sharing the database,
     * must never claim the same step. Because an `UPDATE` cannot lock a fixed
     * number of rows, this finds up to `limit` candidates, locks those that
     * are still claimable with a new lock ID, and returns the ones that ended
     * up with that lock ID.
     */
    fetchAndLockSteps: async (
      limit: number,
    ): Promise<{ steps: AutomationStepToRun[]; nextStepReadyAt: Date | null }> => {
      return await repository.withTransaction(async (trx) => {
        const now = new Date();
        const staleLockCutoff = getStaleLockCutoff(now);
        const lockedBy = randomUUID();

        const candidateIds = await repository.findClaimableRunStepIds(trx, {
          readyBy: now,
          staleLockCutoff,
          limit,
        });
        await repository.lockClaimableRunSteps(trx, candidateIds, {
          lockedBy,
          now,
          staleLockCutoff,
        });
        const lockedSteps = await repository.findLockedRunStepsToRun(trx, candidateIds, lockedBy);

        const rules = await repository.findTriggerRules(
          trx,
          lockedSteps.map((step) => step.automation_id),
        );
        const rulesByAutomation = new AutoFillingMap<string, AutomationTriggerRule[]>(() => []);
        for (const rule of rules) {
          rulesByAutomation.get(rule.automation_id).push(rule);
        }

        return {
          steps: lockedSteps.map((step) => ({
            ...step,
            automation_trigger_rules: rulesByAutomation.get(step.automation_id),
          })),
          nextStepReadyAt: await repository.findNextClaimableRunStepReadyAt(trx, staleLockCutoff),
        };
      });
    },

    /**
     * Atomically finish a locked step and enqueue the next one, so concurrent
     * runners cannot enqueue duplicates.
     *
     * Returns the next step's ready time, or null if no next step was created.
     */
    finishStepAndEnqueueNext: async (
      step: LockedRunStep & Readonly<{ action_id: string; automation_run_id: string }>,
    ): Promise<Date | null> => {
      return await repository.withTransaction(async (trx) => {
        if (!(await markLockedStepTerminal(trx, step, 'finished'))) {
          return null;
        }

        const next = await repository.findNextActionRevision(trx, {
          actionId: step.action_id,
          automationRunId: step.automation_run_id,
        });
        if (!next) {
          return null;
        }

        const now = new Date();
        const readyAt = getReadyAtForAction(next, now, fakeWaitHoursMultiplier);
        await repository.insertRunSteps(trx, [
          {
            id: ObjectId().toHexString(),
            created_at: now,
            updated_at: now,
            automation_run_id: step.automation_run_id,
            automation_action_revision_id: next.automation_action_revision_id,
            ready_at: readyAt,
          },
        ]);
        return readyAt;
      });
    },

    getNumberOfAutomations: (): Promise<number> =>
      repository.withConnection(
        async (connection) => await repository.getNumberOfAutomations(connection),
      ),

    markStepTerminal: async (
      step: LockedRunStep,
      status: AutomationStepTerminalStatus,
    ): Promise<boolean> => {
      return await repository.withConnection((connection) =>
        markLockedStepTerminal(connection, step, status),
      );
    },

    notify: async (
      event: ReadonlyDeep<
        | {
            eventName: 'membership_started';
            source: 'member' | 'admin' | 'api' | 'import' | 'system';
            memberId: string;
            memberStatus: MemberStatus;
            previousMemberStatus: MemberStatus | null;
            memberTierIds: string[];
          }
        | {
            eventName: 'paid_subscription_changed';
            source: 'member' | 'admin' | 'api' | 'import' | 'system';
            memberId: string;
            memberStatus: MemberStatus;
            previousMemberStatus: MemberStatus;
            memberTierIds: string[];
            previousMemberTierIds: string[];
          }
        | {
            eventName: 'label_added';
            labelId: string;
            memberIds: string[];
          }
      >,
    ): Promise<void> => {
      const { eventName } = event;

      if (!labs.isSet('automations')) {
        return;
      }

      let memberIds: readonly string[];
      let findFirstActionOptions: Parameters<typeof repository.findFirstActionRevisions>[1];
      switch (eventName) {
        case 'membership_started': {
          const { source, memberId, memberStatus, memberTierIds, previousMemberStatus } = event;
          if (
            source !== 'member' ||
            memberStatus === 'comped' ||
            (memberStatus === 'paid' && previousMemberStatus === 'gift')
          ) {
            return;
          }
          memberIds = [memberId];
          findFirstActionOptions = {
            eventName,
            memberStatus: memberStatus === 'gift' ? 'paid' : memberStatus,
            memberTierIds,
          };
          break;
        }
        case 'paid_subscription_changed': {
          const { source, memberId, memberStatus, memberTierIds, previousMemberStatus } = event;
          if (source !== 'member') {
            return;
          }
          if (memberStatus === 'comped') {
            return;
          }
          const hadPaidAccess = previousMemberStatus === 'paid' || previousMemberStatus === 'gift';
          if (!hadPaidAccess) {
            return;
          }
          const lostTierAccess = event.previousMemberTierIds.some(
            (id) => !memberTierIds.includes(id),
          );
          if (!lostTierAccess) {
            return;
          }
          memberIds = [memberId];
          findFirstActionOptions = {
            eventName,
            memberStatus: memberStatus === 'gift' ? 'paid' : memberStatus,
            memberTierIds,
            previousMemberTierIds: event.previousMemberTierIds,
          };
          break;
        }
        case 'label_added':
          if (!labs.isSet('automationsLeadMagnets')) {
            return;
          }
          ({ memberIds } = event);
          findFirstActionOptions = { eventName, labelId: event.labelId };
          break;
        default: {
          const _exhaustive: never = eventName;
          throw new errors.IncorrectUsageError({
            message: `Unexpected automation event: ${_exhaustive}`,
          });
        }
      }

      if (memberIds.length === 0) {
        return;
      }

      const didEnroll = await repository.withTransaction(async (trx) => {
        const members = await repository.fetchAndLockMembers(trx, memberIds);
        const firstActions = await repository.findFirstActionRevisions(trx, findFirstActionOptions);
        const priorEnrollments = await repository.findAutomationMemberEnrollments(
          trx,
          firstActions.map((action) => action.automation_id),
          members.map((member) => member.id),
        );
        const hashedEnrollments = new Set(priorEnrollments.map(hashEnrollment));

        const runsToInsert: RunToInsert[] = [];
        const stepsToInsert: RunStepToInsert[] = [];

        for (const member of members) {
          for (const firstAction of firstActions) {
            const memberId = member.id;
            const memberEmail = member.email;
            const automationId = firstAction.automation_id;

            if (
              hashedEnrollments.has(
                hashEnrollment({ automation_id: automationId, member_id: memberId }),
              )
            ) {
              logging.info(
                `Skipping automation ${automationId} for member ${memberId} because they have already run it`,
              );
              continue;
            }

            const now = new Date();

            const readyAt = getReadyAtForAction(firstAction, now, fakeWaitHoursMultiplier);

            const run = {
              id: ObjectId().toHexString(),
              created_at: now,
              updated_at: now,
              automation_id: automationId,
              member_id: memberId,
              member_email: memberEmail,
            };
            runsToInsert.push(run);

            const step = {
              id: ObjectId().toHexString(),
              automation_run_id: run.id,
              automation_action_revision_id: firstAction.automation_action_revision_id,
              created_at: now,
              updated_at: now,
              ready_at: readyAt,
            };
            stepsToInsert.push(step);
          }
        }

        await repository.insertRuns(trx, runsToInsert);
        await repository.insertRunSteps(trx, stepsToInsert);

        return runsToInsert.length > 0;
      });

      if (didEnroll) {
        requestPoll();
      }
    },

    recordEmailSent: async ({
      automationActionRevisionId,
      automationRunStepId,
      mailgunMessageId,
      memberEmail,
      memberId,
      memberName,
      memberUuid,
      trackClicks,
      trackOpens,
    }: RecordEmailSentOptions): Promise<void> => {
      const now = new Date();
      const recipient: EmailRecipientToInsert = {
        id: ObjectId().toHexString(),
        created_at: now,
        updated_at: now,
        member_id: memberId,
        member_uuid: memberUuid,
        member_email: memberEmail,
        member_name: memberName,
        automation_action_revision_id: automationActionRevisionId,
        automation_run_step_id: automationRunStepId,
        ...(mailgunMessageId ? { mailgun_message_id: mailgunMessageId } : {}),
        track_clicks: trackClicks,
        track_opens: trackOpens,
      };

      await repository.withTransaction(async (trx) => {
        // Lock the revision (via this update) before the recipient insert,
        // whose foreign key would otherwise take a shared lock on it first.
        // Click and open tracking also lock revisions before recipients, so
        // a consistent order avoids deadlocks between them.
        await repository.incrementEmailSentCount(trx, automationActionRevisionId);
        await repository.insertEmailRecipient(trx, recipient);
      });
    },

    requestPoll,

    /** Put a locked step back in the queue for another attempt, unless its automation was disabled. */
    retryStep: async (step: LockedRunStep, retryAt: Readonly<Date>): Promise<RetryStepResult> => {
      return await repository.withTransaction(async (trx) => {
        if (!(await repository.isAutomationActiveForRunStep(trx, step.id))) {
          return (await markLockedStepTerminal(trx, step, 'automation disabled'))
            ? 'automation disabled'
            : 'lock lost';
        }

        const didRequeue = await repository.updateLockedRunStep(trx, step, {
          status: 'pending',
          started_at: null,
          finished_at: null,
          ready_at: retryAt,
          updated_at: new Date(),
        });
        return didRequeue ? 'requeued' : 'lock lost';
      });
    },

    trackEmailClicked: async (
      {
        automationActionRevisionId,
        automationRunStepId,
        memberId,
        clickedAt,
      }: TrackEmailClickedOptions,
      { connection }: { connection: RepositoryTransaction },
    ): Promise<void> => {
      await repository.lockActionRevisions(connection, [automationActionRevisionId]);

      const recipient = await repository.findEmailRecipientForClick(connection, {
        automationActionRevisionId,
        automationRunStepId,
        memberId,
      });
      if (!recipient || recipient.clicked_at !== null) {
        return;
      }

      const updated = await repository.setEmailRecipientClickedAt(
        connection,
        recipient.id,
        clickedAt,
      );
      if (!updated) {
        return;
      }

      await repository.incrementEmailClickedCount(connection, automationActionRevisionId);
    },

    trackEmailDeliveredAndOpened: async (
      eventsByAutomatedEmailRecipientId: ReadonlyDeep<
        Map<string, AutomatedEmailRecipientTrackingData>
      >,
    ): Promise<void> => {
      if (eventsByAutomatedEmailRecipientId.size === 0) {
        return;
      }

      const revisionIds = new Set<string>();
      const recipientIds: string[] = [];
      for (const [
        id,
        { openedAt, automationActionRevisionId },
      ] of eventsByAutomatedEmailRecipientId) {
        if (openedAt) {
          revisionIds.add(automationActionRevisionId);
          recipientIds.push(id);
        }
      }

      await repository.withTransaction(async (trx) => {
        await repository.lockActionRevisions(trx, revisionIds);

        const notYetOpened = await repository.lockNotYetOpenedEmailRecipients(trx, recipientIds);
        const newOpensPerRevision = new AutoFillingMap<string, number>(() => 0);

        for (const [
          id,
          { deliveredAt, openedAt, automationActionRevisionId },
        ] of eventsByAutomatedEmailRecipientId) {
          await repository.setEmailRecipientDeliveredAndOpenedAt(trx, id, {
            deliveredAt,
            openedAt,
          });

          if (openedAt && notYetOpened.has(id)) {
            newOpensPerRevision.set(
              automationActionRevisionId,
              newOpensPerRevision.get(automationActionRevisionId) + 1,
            );
          }
        }

        for (const id of revisionIds) {
          const opens = newOpensPerRevision.get(id);
          if (!opens) {
            continue;
          }
          await repository.incrementEmailOpenedCount(trx, id, opens);
        }
      });
    },
  };
};

export type AutomationsApi2<RepositoryTransaction> = ReturnType<
  typeof createAutomationsApi2<RepositoryTransaction>
>;
