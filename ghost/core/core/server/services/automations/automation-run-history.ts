import type { Knex } from 'knex';
import errors from '@tryghost/errors';
import { z } from 'zod';
import { DbDate } from '../../lib/db-types/date';

const runRowSchema = z.object({
  id: z.string(),
  automation_id: z.string(),
  created_at: DbDate,
  member_id: z.string().nullable(),
  member_name: z.string().nullable(),
  member_email: z.string().nullable(),
});

const stepRowSchema = z.object({
  id: z.string(),
  automation_action_revision_id: z.string(),
  created_at: DbDate,
  updated_at: DbDate,
  ready_at: DbDate,
  started_at: DbDate.nullable(),
  finished_at: DbDate.nullable(),
  email_sent_at: DbDate.nullable(),
  email_delivered_at: DbDate.nullable(),
  status: z.string(),
  action_id: z.string().nullable(),
  action_type: z.string().nullable(),
  revision_id: z.string().nullable(),
  wait_hours: z.number().nullable(),
  email_subject: z.string().nullable(),
  email_lexical: z.string().nullable(),
});

const exitStatuses = new Set([
  'failed',
  'automation disabled',
  'member changed status',
  'member unsubscribed',
]);
const knownStatuses = new Set(['pending', 'finished', ...exitStatuses]);

type HistoryAction =
  | { id: string; type: 'wait'; data: { wait_hours: number | null } }
  | {
      id: string;
      type: 'send_email';
      data: { email_subject: string | null; email_lexical: string | null };
    };

function mapStep(row: z.infer<typeof stepRowSchema>) {
  let action: HistoryAction | null = null;
  if (row.revision_id && row.action_id) {
    if (row.action_type === 'wait') {
      action = { id: row.action_id, type: 'wait', data: { wait_hours: row.wait_hours } };
    } else if (row.action_type === 'send_email') {
      action = {
        id: row.action_id,
        type: 'send_email',
        data: { email_subject: row.email_subject, email_lexical: row.email_lexical },
      };
    }
  }
  return {
    id: row.id,
    automation_action_revision_id: row.automation_action_revision_id,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    ready_at: row.ready_at.toISOString(),
    started_at: row.started_at?.toISOString() ?? null,
    finished_at: row.finished_at?.toISOString() ?? null,
    email_sent_at: row.email_sent_at?.toISOString() ?? null,
    email_delivered_at: row.email_delivered_at?.toISOString() ?? null,
    status: row.status,
    action,
  };
}

// Read only the revisions referenced by recorded steps. The current graph is not
// a snapshot of this run, and may have changed even between two of its steps.
export async function readRunHistory(knex: Knex, automationId: string, runId: string) {
  return knex.transaction(async (trx) => {
    const storedRun = await trx('automation_runs as runs')
      .leftJoin('members', 'members.id', 'runs.member_id')
      .where({ 'runs.id': runId, 'runs.automation_id': automationId })
      .select(
        'runs.id',
        'runs.automation_id',
        'runs.created_at',
        'members.id as member_id',
        'members.name as member_name',
        'members.email as member_email',
      )
      .first();
    if (!storedRun) {
      return null;
    }
    const storedSteps = await trx('automation_run_steps as steps')
      .leftJoin('automation_action_revisions as revisions', function () {
        this.on('revisions.id', 'steps.automation_action_revision_id').andOnExists(function () {
          this.select('id')
            .from('automation_actions')
            .where('id', trx.ref('revisions.action_id'))
            .where('automation_id', automationId);
        });
      })
      .leftJoin('automation_actions as actions', 'actions.id', 'revisions.action_id')
      .where('steps.automation_run_id', runId)
      .select(
        'steps.id',
        'steps.automation_action_revision_id',
        'steps.created_at',
        'steps.updated_at',
        'steps.ready_at',
        'steps.started_at',
        'steps.finished_at',
        'steps.status',
        'actions.id as action_id',
        'actions.type as action_type',
        'revisions.id as revision_id',
        'revisions.wait_hours',
        'revisions.email_subject',
        'revisions.email_lexical',
        // A retry can leave more than one recipient record. Read the first
        // successful send/delivery without duplicating the recorded step or
        // exposing recipient identity. Both the step and revision must match.
        ...['created_at', 'delivered_at'].map((column, index) =>
          trx('automated_email_recipients as recipient')
            .min(`recipient.${column}`)
            .where('recipient.automation_run_step_id', trx.ref('steps.id'))
            .where('recipient.automation_action_revision_id', trx.ref('revisions.id'))
            .where('actions.type', 'send_email')
            .as(index === 0 ? 'email_sent_at' : 'email_delivered_at'),
        ),
      )
      .orderBy('steps.created_at', 'asc')
      .orderBy('steps.id', 'asc');

    const parsedRun = runRowSchema.safeParse(storedRun);
    const parsedSteps = z.array(stepRowSchema).safeParse(storedSteps);
    if (!parsedRun.success || !parsedSteps.success) {
      throw new errors.InternalServerError({ message: 'Invalid automation run history.' });
    }
    const run = parsedRun.data;
    const steps = parsedSteps.data.map(mapStep);
    // Match the list/count classification, including pending precedence. Status
    // describes recorded outcomes, not proof of a complete historical graph.
    const status = steps.some((step) => step.status === 'pending')
      ? 'in_progress'
      : !steps.length || steps.some((step) => !knownStatuses.has(step.status))
        ? 'unclassified'
        : steps.some((step) => exitStatuses.has(step.status))
          ? 'exited_early'
          : 'completed';
    const incomplete = steps.some(
      (step) =>
        !knownStatuses.has(step.status) ||
        !step.action ||
        Object.values(step.action.data).some((value) => value === null) ||
        (step.status !== 'pending' && !step.finished_at),
    );
    return {
      id: run.id,
      automation_id: run.automation_id,
      created_at: run.created_at.toISOString(),
      member:
        run.member_id && run.member_email
          ? { id: run.member_id, name: run.member_name, email: run.member_email }
          : null,
      status,
      failed: status === 'exited_early' && steps.some((step) => step.status === 'failed'),
      history_status: !steps.length ? 'empty' : incomplete ? 'partial' : 'available',
      steps,
    };
  });
}
