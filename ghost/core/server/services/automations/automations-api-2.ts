import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import ObjectId from 'bson-objectid';
import type { ReadonlyDeep } from 'type-fest';
import { AutoFillingMap } from '../../lib/auto-filling-map';
import type {
  AutomationsRepository2,
  AutomatedEmailRecipientTrackingData,
  RunStepToInsert,
  RunToInsert,
  TrackEmailClickedOptions,
} from './automations-repository-2';
import { StartAutomationsPollEvent } from './events/start-automations-poll-event';
import { getReadyAtForAction } from './util/get-ready-at-for-action';

type DomainEvents = { dispatch: (event: unknown) => unknown };

type Labs = { isSet(key: 'automations'): boolean };

type MemberStatus = 'free' | 'paid' | 'gift' | 'comped';

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
  domainEvents: DomainEvents;
  fakeWaitHoursMultiplier: null | number;
  labs: Labs;
  repository: AutomationsRepository2<RepositoryTransaction>;
}>) => {
  const requestPoll = (): void => {
    domainEvents.dispatch(StartAutomationsPollEvent.create());
  };

  return {
    getNumberOfAutomations: (): Promise<number> =>
      repository.withConnection(
        async (connection) => await repository.getNumberOfAutomations(connection),
      ),

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

      // TypeScript makes this impossible in theory, but in practice there are
      // untyped callers (and TypeScript doesn't have a sound type system
      // anyway). This check is defense-in-depth.
      switch (eventName) {
        case 'membership_started':
        case 'paid_subscription_changed':
        case 'label_added':
          break;
        default:
          throw new errors.IncorrectUsageError({ message: 'Unsupported automation event.' });
      }

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
          ({ memberIds } = event);
          if (memberIds.length === 0) {
            return;
          }
          findFirstActionOptions = { eventName, labelId: event.labelId };
          break;
        default: {
          const _exhaustive: never = eventName;
          throw new errors.IncorrectUsageError({
            message: `Unexpected automation event: ${_exhaustive}`,
          });
        }
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

    requestPoll,

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
