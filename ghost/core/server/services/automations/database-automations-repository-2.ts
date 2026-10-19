import { type Knex } from 'knex';
import { z } from 'zod';
import { fromDatabaseDate, toDatabaseDate } from '../../lib/db-types/date';
import type {
  AutomationsRepository2,
  AutomationTriggerTierScope,
} from './automations-repository-2';

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

// Keep each insert's bindings well under database limits.
const INSERT_CHUNK_SIZE = 1000;

const TRIGGER_TIER_SCOPE_BY_MEMBER_STATUS = {
  free: 'free',
  paid: 'all_paid',
} as const satisfies Record<'free' | 'paid', AutomationTriggerTierScope>;

const selectExists = async (connection: Connection, query: Knex.QueryBuilder): Promise<boolean> => {
  const row = await connection
    .select<{ exists: boolean | number | string }>(connection.raw('exists ? as `exists`', [query]))
    .first();
  return Boolean(Number(row?.exists));
};

const insertInChunks = async (
  connection: Connection,
  tableName: string,
  rows: ReadonlyArray<Record<string, unknown>>,
): Promise<void> => {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    await connection(tableName).insert(rows.slice(i, i + INSERT_CHUNK_SIZE));
  }
};

/**
 * Select the latest revision of each automation's first (non-deleted) action.
 */
const selectFirstActionRevisions = (connection: Connection): Knex.QueryBuilder =>
  connection('automations as automation')
    .select(
      'automation.id as automation_id',
      'actions.id as action_id',
      'revisions.id as automation_action_revision_id',
      'actions.type as type',
      'revisions.wait_hours as wait_hours',
    )
    .innerJoin('automation_actions as actions', 'actions.automation_id', 'automation.id')
    .innerJoin('automation_action_revisions as revisions', 'revisions.action_id', 'actions.id')
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
    async findActiveLabelTriggers(connection) {
      const rows = await connection('automation_trigger_labels as trigger_label')
        .select(
          'trigger_label.automation_id',
          'trigger_label.label_id',
          'trigger_label.starts_at',
          'trigger_label.checked_until',
        )
        .innerJoin('automations as automation', 'automation.id', 'trigger_label.automation_id')
        .where('automation.status', 'active')
        .where('automation.trigger_type', 'label_added')
        .orderBy(['trigger_label.automation_id', 'trigger_label.label_id']);
      return rows.map((row) => ({
        automation_id: row.automation_id,
        label_id: row.label_id,
        starts_at: fromDatabaseDate(row.starts_at),
        checked_until: row.checked_until ? fromDatabaseDate(row.checked_until) : null,
      }));
    },

    async findFirstActionRevisionForAutomation(connection, automationId) {
      const row = await selectFirstActionRevisions(connection)
        .where('automation.id', automationId)
        .first();
      return row ? nextActionRevisionRowSchema.parse(row) : null;
    },

    async findFirstActionRevisions(connection, memberStatus, memberTierIds) {
      const rows = await selectFirstActionRevisions(connection)
        .where('automation.trigger_type', 'membership_started')
        .where((builder) => {
          builder.where(
            'automation.trigger_tier_scope',
            TRIGGER_TIER_SCOPE_BY_MEMBER_STATUS[memberStatus],
          );
          if (memberStatus === 'paid' && memberTierIds.length > 0) {
            builder.orWhere((selected) => {
              selected
                .where('automation.trigger_tier_scope', 'selected_paid')
                .whereExists(
                  connection('automation_trigger_tiers as trigger_tier')
                    .select('trigger_tier.automation_id')
                    .where('trigger_tier.automation_id', connection.ref('automation.id'))
                    .whereIn('trigger_tier.product_id', memberTierIds),
                );
            });
          }
        })
        .where('automation.status', 'active');
      return rows.map((row: unknown) => nextActionRevisionRowSchema.parse(row));
    },

    async findMemberLabels(connection, memberIds) {
      return await connection('members_labels')
        .select('member_id', 'label_id as related_id')
        .whereIn('member_id', [...memberIds]);
    },

    async findMemberNewsletters(connection, memberIds) {
      return await connection('members_newsletters')
        .select('member_id', 'newsletter_id as related_id')
        .whereIn('member_id', [...memberIds]);
    },

    async findMemberTiers(connection, memberIds) {
      return await connection('members_products')
        .select('member_id', 'product_id as related_id')
        .whereIn('member_id', [...memberIds]);
    },

    async findMembers(connection, memberIds) {
      const rows = await connection('members')
        .select('id', 'email', 'name', 'uuid', 'status', 'enable_updates_and_announcements')
        .whereIn('id', [...memberIds]);
      return rows.map((row) => ({
        ...row,
        enable_updates_and_announcements:
          row.enable_updates_and_announcements === null
            ? null
            : Boolean(row.enable_updates_and_announcements),
      }));
    },

    async findMembersWithLabelAdded(connection, { automationId, labelId, from, to, after, limit }) {
      const query = connection('members_labels as member_label')
        .select(
          'member_label.id as id',
          'member_label.created_at as created_at',
          'member_label.member_id as member_id',
          'member.email as member_email',
        )
        .innerJoin('members as member', 'member.id', 'member_label.member_id')
        // This is a `LEFT JOIN ... IS NULL` instead of `NOT EXISTS` because
        // MySQL materializes every run of the automation for `NOT EXISTS`,
        // which is slow when paging through lots of members. Without the
        // index hint, MySQL sometimes scans all of the automation's runs for
        // every member, which takes minutes for big automations.
        .hintComment('INDEX(run automation_runs_automation_id_member_id_index)')
        .leftJoin('automation_runs as run', (join) => {
          join
            .on('run.member_id', 'member_label.member_id')
            .andOnVal('run.automation_id', automationId);
        })
        .whereNull('run.id')
        .where('member_label.label_id', labelId)
        .where('member_label.created_at', '>=', toDatabaseDate(from))
        .where('member_label.created_at', '<=', toDatabaseDate(to))
        .orderBy(['member_label.created_at', 'member_label.id'])
        .limit(limit);
      if (after) {
        const afterCreatedAt = toDatabaseDate(after.created_at);
        query.where((builder) => {
          builder.where('member_label.created_at', '>', afterCreatedAt).orWhere((tie) => {
            tie
              .where('member_label.created_at', afterCreatedAt)
              .where('member_label.id', '>', after.id);
          });
        });
      }
      const rows = await query;
      return rows.map((row) => ({
        id: row.id,
        created_at: fromDatabaseDate(row.created_at),
        member_id: row.member_id,
        member_email: row.member_email,
      }));
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
      await insertInChunks(
        connection,
        'automation_run_steps',
        toInsert.map((step) => ({
          ...step,
          created_at: toDatabaseDate(step.created_at),
          updated_at: toDatabaseDate(step.updated_at),
          ready_at: toDatabaseDate(step.ready_at),
        })),
      );
    },

    async insertRuns(connection, toInsert) {
      await insertInChunks(
        connection,
        'automation_runs',
        toInsert.map((run) => ({
          ...run,
          created_at: toDatabaseDate(run.created_at),
          updated_at: toDatabaseDate(run.updated_at),
        })),
      );
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

    async lockActiveLabelAddedAutomation(connection, automationId) {
      const row = await connection('automations')
        .where({ id: automationId, status: 'active', trigger_type: 'label_added' })
        .forUpdate()
        .first('id');
      return Boolean(row);
    },

    async lockMember(connection, memberId) {
      await connection('members').where('id', memberId).forUpdate().first('id');
    },

    async setLabelTriggerCheckedUntil(connection, automationId, labelId, checkedUntil) {
      await connection('automation_trigger_labels')
        .where({ automation_id: automationId, label_id: labelId })
        .update({ checked_until: toDatabaseDate(checkedUntil) });
    },

    withConnection: (fn) => fn(knex),

    withTransaction: (fn) => knex.transaction(async (txn) => await fn(txn)),
  } satisfies AutomationsRepository2<Connection>;
};
