import { type Knex } from 'knex';
import { z } from 'zod';
import type { AutomationsRepository2 } from './automations-repository-2';

type Connection = Knex | Knex.Transaction;

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
    async findFirstActionRevisions(
      connection,
      memberStatus,
      memberTierIds,
      previousMemberTierIds: ReadonlyArray<string> | undefined = undefined,
    ) {
      if (memberStatus === 'comped') {
        return [];
      }
      const isChange = previousMemberTierIds !== undefined;
      const triggerType = isChange ? 'paid_subscription_changed' : 'membership_started';
      const rules = connection('automation_trigger_rules as rule')
        .select(connection.raw('1'))
        .where('rule.automation_id', connection.ref('automation.id'))
        .where('rule.trigger_type', triggerType)
        .where((builder) => {
          if (memberStatus === 'free') {
            builder.where('rule.to_scope', 'free');
          } else {
            builder.where((selected) => {
              selected
                .where('rule.to_scope', 'specific_tier')
                .whereIn('rule.to_product_id', memberTierIds);
              if (isChange) {
                selected.whereNotIn('rule.to_product_id', previousMemberTierIds);
              }
            });
            if (!isChange) {
              builder.orWhere('rule.to_scope', 'all_paid');
            }
          }
        });
      if (isChange) {
        rules.where((builder) => {
          builder
            .where('rule.from_scope', 'all_paid')
            .orWhere((selected) =>
              selected
                .where('rule.from_scope', 'specific_tier')
                .whereIn('rule.from_product_id', previousMemberTierIds),
            );
        });
      } else {
        rules.whereNull('rule.from_scope').whereNull('rule.from_product_id');
      }
      const rows = await connection('automations as automation')
        .select(
          'automation.id as automation_id',
          'actions.id as action_id',
          'revisions.id as automation_action_revision_id',
          'actions.type as type',
          'revisions.wait_hours as wait_hours',
        )
        .innerJoin('automation_actions as actions', 'actions.automation_id', 'automation.id')
        .innerJoin('automation_action_revisions as revisions', 'revisions.action_id', 'actions.id')
        .whereExists(rules)
        .where('automation.trigger_type', triggerType)
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

    async lockMember(connection, memberId) {
      await connection('members').where('id', memberId).forUpdate().first('id');
    },

    withConnection: (fn) => fn(knex),

    withTransaction: (fn) => knex.transaction(async (txn) => await fn(txn)),
  } satisfies AutomationsRepository2<Connection>;
};
