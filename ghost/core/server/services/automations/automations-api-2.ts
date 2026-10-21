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

    trigger: async ({
      event,
      memberEmail,
      memberId,
      memberStatus,
      memberTierIds,
    }: ReadonlyDeep<{
      event: 'membership_started';
      memberEmail: string;
      memberId: string;
      memberStatus: 'free' | 'paid';
      memberTierIds: string[];
    }>): Promise<void> => {
      // TypeScript makes this impossible in theory, but in practice there are
      // untyped callers (and TypeScript doesn't have a sound type system
      // anyway). This check is defense-in-depth.
      if (event !== 'membership_started') {
        throw new errors.IncorrectUsageError({
          message: 'Member signup is the only supported event right now. More may be added later',
        });
      }

      if (!labs.isSet('automations')) {
        return;
      }

      await repository.withTransaction(async (trx) => {
        await repository.lockMember(trx, memberId);

        const firstActions = await repository.findFirstActionRevisions(
          trx,
          memberStatus,
          memberTierIds,
        );

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
      });

      requestPoll();
    },
  };
};
