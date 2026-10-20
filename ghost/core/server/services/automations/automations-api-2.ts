import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import ObjectId from 'bson-objectid';
import type { ReadonlyDeep } from 'type-fest';
import type {
  AutomationsRepository2,
  RunStepToInsert,
  RunToInsert,
} from './automations-repository-2';
import { StartAutomationsPollEvent } from './events/start-automations-poll-event';
import { getReadyAtForAction } from './util/get-ready-at-for-action';

type DomainEvents = { dispatch: (event: unknown) => unknown };

type Labs = { isSet(key: 'automations'): boolean };

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

    requestPoll,

    trigger: async (
      data: ReadonlyDeep<
        {
          memberEmail: string;
          memberId: string;
        } & (
          | {
              event: 'membership_started';
              memberStatus: 'free' | 'paid';
              memberTierIds: string[];
            }
          | {
              event: 'paid_subscription_changed';
              previousMemberStatus: 'free' | 'paid' | 'gift' | 'comped';
              previousMemberTierIds: string[];
              memberStatus: 'free' | 'paid' | 'gift' | 'comped';
              memberTierIds: string[];
            }
        )
      >,
    ): Promise<void> => {
      switch (data.event) {
        case 'membership_started':
          break;
        case 'paid_subscription_changed': {
          if (data.previousMemberStatus !== 'paid' || data.memberStatus === 'comped') {
            return;
          }
          const previousTiers = new Set(data.previousMemberTierIds);
          const currentTiers = new Set(data.memberTierIds);
          if (
            data.memberStatus === data.previousMemberStatus &&
            previousTiers.size === currentTiers.size &&
            [...previousTiers].every((id) => currentTiers.has(id))
          ) {
            return;
          }
          break;
        }
        default: {
          // Untyped callers can still supply unsupported events.
          const _exhaustive: never = data;
          throw new errors.IncorrectUsageError({
            message: `Unsupported automation event: ${_exhaustive}`,
          });
        }
      }

      if (!labs.isSet('automations')) {
        return;
      }

      const { memberId, memberEmail } = data;
      const didEnroll = await repository.withTransaction(async (trx) => {
        await repository.lockMember(trx, memberId);

        const firstActions = await (() => {
          switch (data.event) {
            case 'membership_started':
              return repository.findFirstActionRevisionsForMembershipStart(
                trx,
                data.memberStatus,
                data.memberTierIds,
              );
            case 'paid_subscription_changed':
              return repository.findFirstActionRevisionsForSubscriptionChange(
                trx,
                data.previousMemberTierIds,
                data.memberStatus,
                data.memberTierIds,
              );
            default: {
              const _exhaustive: never = data;
              throw new errors.IncorrectUsageError({
                message: `Unsupported automation event: ${_exhaustive}`,
              });
            }
          }
        })();

        const runsToInsert: RunToInsert[] = [];
        const stepsToInsert: RunStepToInsert[] = [];

        await Promise.all(
          firstActions.map(async (firstAction) => {
            const automationId = firstAction.automation_id;

            if (await repository.hasMemberEnteredAutomation(trx, automationId, memberId)) {
              logging.info(
                `Skipping automation ${automationId} for member ${memberId} because they have already run it`,
              );
              return;
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
          }),
        );

        await repository.insertRuns(trx, runsToInsert);
        await repository.insertRunSteps(trx, stepsToInsert);
        return runsToInsert.length > 0;
      });

      if (didEnroll) {
        requestPoll();
      }
    },
  };
};
