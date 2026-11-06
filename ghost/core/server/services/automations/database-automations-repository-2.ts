import errors from '@tryghost/errors';
import { type Knex } from 'knex';
import { z } from 'zod';
import type { AutomationsRepository2 } from './automations-repository-2';

type Connection = Knex | Knex.Transaction;

const emailRecipientIdRowSchema = z.object({
  id: z.string(),
});

const emailRecipientClickRowSchema = z.object({
  id: z.string(),
  clicked_at: z.coerce.date().nullable(),
});

const nextActionRevisionRowBaseSchema = z.object({
  automation_id: z.string(),
  action_id: z.string(),
  automation_action_revision_id: z.string(),
});
const nextActionRevisionRowSchema = z.discriminatedUnion('type', [
  nextActionRevisionRowBaseSchema.extend({
    type: z.literal('wait'),
    wait_hours: z.number().int().nonnegative(),
  }),
  nextActionRevisionRowBaseSchema.extend({
    type: z.literal('send_email'),
    wait_hours: z.null(),
  }),
]);

const selectExists = async (connection: Connection, query: Knex.QueryBuilder): Promise<boolean> => {
  const row = await connection
    .select<{ exists: boolean | number | string }>(connection.raw('exists ? as `exists`', [query]))
    .first();
  return Boolean(Number(row?.exists));
};

const applyMembershipStartedFilters = (
  query: Knex.QueryBuilder,
  connection: Connection,
  {
    memberStatus,
    memberTierIds,
  }: Extract<
    Parameters<AutomationsRepository2<Connection>['findFirstActionRevisions']>[1],
    { eventName: 'membership_started' }
  >,
): void => {
  query.whereExists(
    connection('automation_trigger_rules as rule')
      .select('rule.id')
      .where('rule.automation_id', connection.ref('automation.id'))
      .where((builder) => {
        switch (memberStatus) {
          case 'free':
            builder.where('rule.trigger_type', 'free_signup');
            break;
          case 'paid':
            builder.where('rule.trigger_type', 'paid_subscription_started').where((paid) => {
              paid.where('rule.scope', 'any_paid_tier');
              if (memberTierIds.length > 0) {
                paid.orWhere((specific) =>
                  specific
                    .where('rule.scope', 'specific_paid_tier')
                    .whereIn('rule.product_id', memberTierIds),
                );
              }
            });
            break;
          default: {
            const _exhaustive: never = memberStatus;
            throw new errors.InternalServerError({
              message: `Unexpected member status: ${_exhaustive}`,
            });
          }
        }
      }),
  );
};

const applyPaidSubscriptionChangedFilters = (
  query: Knex.QueryBuilder,
  connection: Connection,
  {
    memberStatus,
    memberTierIds,
    previousMemberTierIds,
  }: Extract<
    Parameters<AutomationsRepository2<Connection>['findFirstActionRevisions']>[1],
    { eventName: 'paid_subscription_changed' }
  >,
): void => {
  const lostTierIds = previousMemberTierIds.filter((id) => !memberTierIds.includes(id));
  if (lostTierIds.length === 0) {
    // If no tiers were lost, no paid subscription change triggers will match.
    query.whereRaw('FALSE');
    return;
  }

  const gainedTierIds = memberTierIds.filter((id) => !previousMemberTierIds.includes(id));

  // Is there a matching "from" rule?
  query.whereExists(
    connection('automation_trigger_rules as rule')
      .select('rule.id')
      .where('rule.automation_id', connection.ref('automation.id'))
      .where('rule.trigger_type', 'paid_subscription_changed')
      .where('rule.direction', 'from')
      .where((from) => {
        from.whereIn('rule.product_id', lostTierIds);
        from.orWhere((anyPaid) => {
          anyPaid
            .where('rule.scope', 'any_paid_tier')
            // Don't include "from" rules if they overlap with "to" rules.
            .whereNotExists(
              connection('automation_trigger_rules as previous_destination')
                .select('previous_destination.id')
                .where('previous_destination.automation_id', connection.ref('automation.id'))
                .where('previous_destination.trigger_type', 'paid_subscription_changed')
                .where('previous_destination.direction', 'to')
                .whereIn('previous_destination.product_id', previousMemberTierIds),
            );
        });
      }),
  );

  // Is there a matching "to" rule?
  query.whereExists(
    connection('automation_trigger_rules as destination')
      .select('destination.id')
      .where('destination.automation_id', connection.ref('automation.id'))
      .where('destination.trigger_type', 'paid_subscription_changed')
      .where('destination.direction', 'to')
      .where((to) => {
        to.whereIn('destination.product_id', gainedTierIds);
        if (memberStatus === 'free' && memberTierIds.length === 0) {
          to.orWhere('destination.scope', 'free');
        }
      }),
  );
};

/**
 * Create a database-backed automations repository. See `AutomationsRepository2`
 * for details on what should (and should not) be in here.
 *
 * NOTE: `createDatabaseAutomationsRepository2` will soon subsume `createDatabaseAutomationsRepository`. See NY-1704.
 */
export const createDatabaseAutomationsRepository2 = ({
  knex,
}: Readonly<{
  knex: Knex;
}>) => {
  return {
    async deleteTriggerRules(connection, automationId) {
      await connection('automation_trigger_rules').where('automation_id', automationId).delete();
    },

    async findEmailRecipientForClick(
      connection,
      { automationActionRevisionId, automationRunStepId, memberId },
    ) {
      const row = await connection('automated_email_recipients')
        .select('id', 'clicked_at')
        .where({
          automation_action_revision_id: automationActionRevisionId,
          automation_run_step_id: automationRunStepId,
          member_id: memberId,
          track_clicks: true,
        })
        .forUpdate()
        .first();
      return row === undefined ? undefined : emailRecipientClickRowSchema.parse(row);
    },

    async findFirstActionRevisions(connection, options) {
      const rows: unknown[] = await connection('automations as automation')
        .select(
          'automation.id as automation_id',
          'actions.id as action_id',
          'revisions.id as automation_action_revision_id',
          'actions.type as type',
          'revisions.wait_hours as wait_hours',
        )
        .innerJoin('automation_actions as actions', 'actions.automation_id', 'automation.id')
        .innerJoin('automation_action_revisions as revisions', 'revisions.action_id', 'actions.id')
        .modify((query) => {
          switch (options.eventName) {
            case 'membership_started':
              applyMembershipStartedFilters(query, connection, options);
              break;
            case 'paid_subscription_changed':
              applyPaidSubscriptionChangedFilters(query, connection, options);
              break;
            default: {
              const _exhaustive: never = options;
              throw new errors.InternalServerError({
                message: `Unexpected automation event: ${_exhaustive}`,
              });
            }
          }
        })
        .where('automation.status', 'active')
        .whereNull('actions.deleted_at')
        .whereNotExists(
          connection('automation_action_edges as edge')
            .select('edge.target_action_id')
            .innerJoin(
              'automation_actions as source_actions',
              'source_actions.id',
              'edge.source_action_id',
            )
            .whereNull('source_actions.deleted_at')
            .where('edge.target_action_id', connection.ref('actions.id')),
        )
        .where(
          'revisions.created_at',
          connection('automation_action_revisions')
            .max('created_at')
            .where('action_id', connection.ref('actions.id')),
        )
        .orderBy(['actions.created_at', 'actions.id']);
      return rows.map((row) => nextActionRevisionRowSchema.parse(row));
    },

    async getNumberOfAutomations(connection) {
      const result = await connection('automations').count({ count: '*' }).first();
      return Number(result?.count ?? 0);
    },

    async hasMemberEnteredAutomation(connection, automationId, memberId) {
      const query = connection('automation_runs')
        .select(connection.raw('1'))
        .where({ automation_id: automationId, member_id: memberId });
      return await selectExists(connection, query);
    },

    async incrementEmailClickedCount(connection, revisionId) {
      await connection('automation_action_revisions')
        .where({ id: revisionId })
        .update({ email_clicked_count: connection.raw('COALESCE(email_clicked_count, 0) + 1') });
    },

    async incrementEmailOpenedCount(connection, actionRevisionId, count) {
      await connection('automation_action_revisions')
        .where('id', actionRevisionId)
        .update(
          'email_opened_count',
          connection.raw('COALESCE(email_opened_count, 0) + ?', [count]),
        );
    },

    async insertActions(connection, toInsert) {
      if (toInsert.length > 0) {
        await connection('automation_actions').insert(toInsert);
      }
    },

    async insertRunSteps(connection, toInsert) {
      if (toInsert.length > 0) {
        await connection('automation_run_steps').insert(
          toInsert.map((step) => ({
            ...step,
            created_at: step.created_at,
            updated_at: step.updated_at,
            ready_at: step.ready_at,
          })),
        );
      }
    },

    async insertRuns(connection, toInsert) {
      if (toInsert.length > 0) {
        await connection('automation_runs').insert(
          toInsert.map((run) => ({
            ...run,
            created_at: run.created_at,
            updated_at: run.updated_at,
          })),
        );
      }
    },

    async insertTriggerRules(connection, toInsert) {
      if (toInsert.length > 0) {
        await connection('automation_trigger_rules').insert(toInsert);
      }
    },

    async isAutomationActiveForRun(connection, automationRunId) {
      const query = connection('automation_runs as run')
        .select(connection.raw('1'))
        .innerJoin('automations as automation', 'automation.id', 'run.automation_id')
        .where('run.id', automationRunId)
        .where('automation.status', 'active');
      return await selectExists(connection, query);
    },

    async isAutomationActiveForRunStep(connection, runStepId) {
      const query = connection('automation_run_steps as step')
        .select(connection.raw('1'))
        .innerJoin('automation_runs as run', 'run.id', 'step.automation_run_id')
        .innerJoin('automations as automation', 'automation.id', 'run.automation_id')
        .where('step.id', runStepId)
        .where('automation.status', 'active');
      return await selectExists(connection, query);
    },

    async loadEdgeRows(connection, automationId) {
      return await connection('automation_action_edges as e')
        .select('e.source_action_id', 'e.target_action_id')
        .innerJoin('automation_actions as source_action', (join) => {
          join.on('source_action.id', 'e.source_action_id').onNull('source_action.deleted_at');
        })
        .innerJoin('automation_actions as target_action', (join) => {
          join
            .on('target_action.id', 'e.target_action_id')
            .onNull('target_action.deleted_at')
            .on('target_action.automation_id', 'source_action.automation_id');
        })
        .where('source_action.automation_id', automationId)
        .orderBy(['e.source_action_id', 'e.target_action_id']);
    },

    async lockActionRevisions(connection, revisionIds) {
      const ids = [...new Set(revisionIds)];
      if (ids.length === 0) {
        return;
      }
      await connection('automation_action_revisions')
        .select('id')
        .whereIn('id', ids)
        .orderBy('id')
        .forUpdate();
    },

    async lockMember(connection, memberId) {
      await connection('members').where('id', memberId).forUpdate().first('id');
    },

    async lockNotYetOpenedEmailRecipients(connection, automatedEmailRecipientIds) {
      if (automatedEmailRecipientIds.length === 0) {
        return new Set<string>();
      }
      const rows: unknown[] = await connection('automated_email_recipients')
        .select('id')
        .whereIn('id', automatedEmailRecipientIds)
        .whereNull('opened_at')
        .forUpdate();
      return new Set(rows.map((row) => emailRecipientIdRowSchema.parse(row).id));
    },

    async setEmailRecipientClickedAt(connection, recipientId, clickedAt) {
      const updated = await connection('automated_email_recipients')
        .where({ id: recipientId })
        .whereNull('clicked_at')
        .update({ clicked_at: clickedAt });
      return updated > 0;
    },

    async setEmailRecipientDeliveredAndOpenedAt(
      connection,
      automatedEmailRecipientId,
      { deliveredAt, openedAt },
    ) {
      if (!deliveredAt && !openedAt) {
        return;
      }
      const updates: { delivered_at?: Knex.Raw; opened_at?: Knex.Raw } = {};
      if (deliveredAt) {
        updates.delivered_at = connection.raw(
          'CASE WHEN delivered_at IS NULL OR delivered_at > ? THEN ? ELSE delivered_at END',
          [deliveredAt, deliveredAt],
        );
      }
      if (openedAt) {
        updates.opened_at = connection.raw(
          'CASE WHEN opened_at IS NULL OR opened_at > ? THEN ? ELSE opened_at END',
          [openedAt, openedAt],
        );
      }
      await connection('automated_email_recipients')
        .where('id', automatedEmailRecipientId)
        .update(updates);
    },

    withConnection: (fn) => fn(knex),

    withTransaction: (fn) => knex.transaction(async (txn) => await fn(txn)),
  } satisfies AutomationsRepository2<Connection>;
};
