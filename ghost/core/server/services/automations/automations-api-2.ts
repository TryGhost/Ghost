import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import ObjectId from 'bson-objectid';
import type { ReadonlyDeep } from 'type-fest';
import type { AutomationMember } from './automations-repository';
import type {
  AutomationsRepository2,
  LabelAddedRow,
  LabelTriggerRow,
  RunStepToInsert,
  RunToInsert,
} from './automations-repository-2';
import { LABEL_ADDED_BATCH_SIZE, LABEL_ADDED_OVERLAP_MS } from './constants';
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

  /**
   * Enter one batch of members into a "label added" automation.
   *
   * Returns the label additions that were found, or `null` if the automation
   * can't be entered (for example, because it was deactivated).
   */
  const enqueueLabelAddedRunBatch = async (
    labelTrigger: Readonly<LabelTriggerRow>,
    options: Readonly<{
      from: Readonly<Date>;
      to: Readonly<Date>;
      after: null | Readonly<LabelAddedRow>;
    }>,
  ): Promise<null | { labelAddedRows: LabelAddedRow[]; enqueuedRunCount: number }> =>
    await repository.withTransaction(async (trx) => {
      const automationId = labelTrigger.automation_id;

      // Locking the automation prevents concurrent pollers from entering the same member twice.
      if (!(await repository.lockActiveLabelAddedAutomation(trx, automationId))) {
        return null;
      }

      const firstAction = await repository.findFirstActionRevisionForAutomation(trx, automationId);
      if (!firstAction) {
        return null;
      }

      const labelAddedRows = await repository.findMembersWithLabelAdded(trx, {
        automationId,
        labelId: labelTrigger.label_id,
        from: options.from,
        to: options.to,
        after: options.after,
        limit: LABEL_ADDED_BATCH_SIZE,
      });

      const now = new Date();
      const readyAt = getReadyAtForAction(firstAction, now, fakeWaitHoursMultiplier);
      const runsToInsert: RunToInsert[] = [];
      const stepsToInsert: RunStepToInsert[] = [];
      const memberIds = new Set<string>();
      for (const labelAddedRow of labelAddedRows) {
        if (memberIds.has(labelAddedRow.member_id)) {
          continue;
        }
        memberIds.add(labelAddedRow.member_id);

        const runId = ObjectId().toHexString();
        runsToInsert.push({
          id: runId,
          created_at: now,
          updated_at: now,
          automation_id: automationId,
          member_id: labelAddedRow.member_id,
          member_email: labelAddedRow.member_email,
        });
        stepsToInsert.push({
          id: ObjectId().toHexString(),
          automation_run_id: runId,
          automation_action_revision_id: firstAction.automation_action_revision_id,
          created_at: now,
          updated_at: now,
          ready_at: readyAt,
        });
      }

      await repository.insertRuns(trx, runsToInsert);
      await repository.insertRunSteps(trx, stepsToInsert);

      return { labelAddedRows, enqueuedRunCount: runsToInsert.length };
    });

  /**
   * Enter members into a "label added" automation for one of its labels.
   * Returns the number of members who entered.
   */
  const enqueueLabelAddedRunsForLabel = async (
    labelTrigger: Readonly<LabelTriggerRow>,
  ): Promise<number> => {
    const to = new Date();
    const from = labelTrigger.checked_until
      ? new Date(
          Math.max(
            labelTrigger.starts_at.getTime(),
            labelTrigger.checked_until.getTime() - LABEL_ADDED_OVERLAP_MS,
          ),
        )
      : labelTrigger.starts_at;

    let enqueuedRunCount = 0;
    let after: null | LabelAddedRow = null;
    while (true) {
      const result = await enqueueLabelAddedRunBatch(labelTrigger, { from, to, after });
      if (!result) {
        return enqueuedRunCount;
      }

      enqueuedRunCount += result.enqueuedRunCount;
      if (result.enqueuedRunCount > 0) {
        // Start running steps while we enqueue the rest.
        requestPoll();
      }

      if (result.labelAddedRows.length < LABEL_ADDED_BATCH_SIZE) {
        break;
      }
      after = result.labelAddedRows[result.labelAddedRows.length - 1];
    }

    await repository.withConnection((connection) =>
      repository.setLabelTriggerCheckedUntil(
        connection,
        labelTrigger.automation_id,
        labelTrigger.label_id,
        to,
      ),
    );

    return enqueuedRunCount;
  };

  return {
    /**
     * Enter members into active "label added" automations if they've had a
     * trigger label added since the automation started. Members enter if *any*
     * of the automation's labels were added.
     *
     * Returns whether there are any active "label added" automations, which
     * tells the caller whether to check again later.
     */
    enqueueLabelAddedRuns: async (): Promise<{ hasLabelTriggers: boolean }> => {
      if (!labs.isSet('automations')) {
        return { hasLabelTriggers: false };
      }

      const labelTriggers = await repository.withConnection((connection) =>
        repository.findActiveLabelTriggers(connection),
      );

      for (const labelTrigger of labelTriggers) {
        const startedAt = Date.now();
        const enqueuedRunCount = await enqueueLabelAddedRunsForLabel(labelTrigger);
        if (enqueuedRunCount > 0) {
          logging.info(
            {
              system: {
                event: 'automations.label_added.enqueued',
                automation_id: labelTrigger.automation_id,
                label_id: labelTrigger.label_id,
                enqueued_run_count: enqueuedRunCount,
                duration_ms: Date.now() - startedAt,
              },
            },
            `[AUTOMATIONS] Entered ${enqueuedRunCount} members into automation ${labelTrigger.automation_id} for label ${labelTrigger.label_id}`,
          );
        }
      }

      return { hasLabelTriggers: labelTriggers.length > 0 };
    },

    /** Load members' data for running automation steps. */
    findMembers: (memberIds: ReadonlyArray<string>): Promise<Map<string, AutomationMember>> =>
      repository.withConnection(async (connection) => {
        const [memberRows, labelRows, newsletterRows, tierRows] = await Promise.all([
          repository.findMembers(connection, memberIds),
          repository.findMemberLabels(connection, memberIds),
          repository.findMemberNewsletters(connection, memberIds),
          repository.findMemberTiers(connection, memberIds),
        ]);

        const result = new Map<string, AutomationMember>();
        for (const memberRow of memberRows) {
          result.set(memberRow.id, {
            ...memberRow,
            is_subscribed_to_any_newsletter: false,
            label_ids: [],
            tier_ids: [],
          });
        }
        for (const { member_id: memberId, related_id: labelId } of labelRows) {
          result.get(memberId)?.label_ids.push(labelId);
        }
        for (const { member_id: memberId } of newsletterRows) {
          const member = result.get(memberId);
          if (member) {
            member.is_subscribed_to_any_newsletter = true;
          }
        }
        for (const { member_id: memberId, related_id: tierId } of tierRows) {
          result.get(memberId)?.tier_ids.push(tierId);
        }
        return result;
      }),

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
