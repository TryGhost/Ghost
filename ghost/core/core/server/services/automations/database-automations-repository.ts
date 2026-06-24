import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import crypto from 'node:crypto';
import ObjectId from 'bson-objectid';
import {dequal} from 'dequal';
import {type Knex} from 'knex';
import moment from 'moment';
import {DEFAULT_EMAIL_DESIGN_SETTING_SLUG, MEMBER_WELCOME_EMAIL_SLUGS} from '../member-welcome-emails/constants';
import type {
    Automation,
    AutomationAction,
    AutomationEdge,
    AutomationSummary,
    AutomationStepTerminalStatus,
    AutomationStepToRun,
    AutomationsRepository,
    EditAutomationData,
    Page
} from './automations-repository';
import {getStaleLockCutoff} from './stale-lock-cutoff';
import type {ExclusifyUnion, ReadonlyDeep} from 'type-fest';

const HOUR_MS = 60 * 60 * 1000;
const DATABASE_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const DEFAULT_WELCOME_EMAIL_AUTOMATIONS = [{
    name: 'Free member welcome flow',
    slug: MEMBER_WELCOME_EMAIL_SLUGS.free
}, {
    name: 'Paid member welcome flow',
    slug: MEMBER_WELCOME_EMAIL_SLUGS.paid
}];

const messages = {
    invalidAutomationActionRevision: 'Automation action "{actionId}" of type "{actionType}" is missing required revision field "{field}".',
    conflictingAutomationActionId: 'Automation action "{actionId}" already exists and cannot be inserted.',
    conflictingAutomationActionType: 'Automation action "{actionId}" already exists with a different type.',
    defaultEmailDesignSettingNotFound: 'Default automated email design setting not found.'
};

const DEFAULT_EMAIL_DESIGN_SETTING_REFERENCE = DEFAULT_EMAIL_DESIGN_SETTING_SLUG;

interface AutomationRow {
    id: string;
    slug: string;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
}

function toDatabaseDate(date: Date | string): string {
    return moment(date).format(DATABASE_DATE_FORMAT);
}

interface ActionRow {
    id: string;
    type: 'wait' | 'send_email';
    wait_hours: number | null;
    email_subject: string | null;
    email_lexical: string | null;
    email_design_setting_id: string | null;
}

type ActionRevisionRow = {
    action_id: string;
    created_at: string;
    wait_hours: number | null;
    email_subject: string | null;
    email_lexical: string | null;
    email_design_setting_id: string | null;
};

interface EdgeRow {
    source_action_id: string;
    target_action_id: string;
}

type NextActionRevisionRow = {
    automation_id: string;
    action_id: string;
    automation_action_revision_id: string;
    type: 'wait' | 'send_email';
    wait_hours: number | null;
};

type StepToRunRow = {
    id: string;
    locked_by: string;
    automation_run_id: string;
    automation_id: string;
    automation_slug: string;
    automation_status: 'inactive' | 'active';
    member_id: string | null;
    member_email: string;
    action_id: string;
    automation_action_revision_id: string;
    type: string;
    ready_at: string;
    step_attempts: number;
    wait_hours: number | null;
    email_subject: string | null;
    email_lexical: string | null;
    email_design_setting_id: string | null;
};

type WaitActionData = Extract<AutomationAction, {type: 'wait'}>['data'];
type SendEmailActionData = Extract<AutomationAction, {type: 'send_email'}>['data'];
type RevisionDataFor<ActionDataT> = {
    [FieldT in keyof ActionDataT]: ActionRevisionRow[FieldT & keyof ActionRevisionRow];
};
type WaitRevisionData = RevisionDataFor<WaitActionData>;
type SendEmailRevisionData = RevisionDataFor<SendEmailActionData>;

type ActionToInsert = {
    id: string;
    created_at: string;
    updated_at: string;
    automation_id: string;
    type: AutomationAction['type'];
};
type ActionRevisionToInsert = {
    actionId: string;
    action: AutomationAction;
    createdAt: string;
};

export function createDatabaseAutomationsRepository({
    knex,
    fakeWaitHoursMultiplier
}: {
    knex: Knex;
    fakeWaitHoursMultiplier: number | null;
}): AutomationsRepository {
    return {
        async browse(): Promise<Page<AutomationSummary>> {
            return await knex.transaction(async (trx) => {
                await ensureDefaultAutomations(trx);
                const rows = await loadAutomations(trx);
                return {
                    data: rows.map(row => buildAutomationSummary(row)),
                    meta: {
                        pagination: buildPagination(rows.length)
                    }
                };
            });
        },

        async getById(id: string): Promise<Automation | null> {
            return await knex.transaction(async (trx) => {
                const automation = await loadAutomation(trx, id);

                if (!automation) {
                    return null;
                }

                return await buildAutomation(trx, automation);
            });
        },

        async edit(id: string, data: EditAutomationData): Promise<Automation | null> {
            return await knex.transaction(async (trx) => {
                const automation = await loadAutomation(trx, id);

                if (!automation) {
                    return null;
                }

                const now = new Date();

                const updatedAutomation = await updateAutomation(trx, {
                    ...automation,
                    status: data.status,
                    updated_at: toDatabaseDate(now)
                });

                await replaceAutomationGraph(trx, updatedAutomation.id, data.actions, data.edges);

                if (updatedAutomation.status === 'inactive') {
                    await cancelCancelablePendingStepsForAutomation(trx, updatedAutomation.id, now);
                }

                return await buildAutomation(trx, updatedAutomation);
            });
        },

        async trigger(options: {
            memberEmail: string;
            memberId: string;
            memberStatus: 'free' | 'paid';
        }): Promise<void> {
            return await knex.transaction(trx => trigger(trx, {
                ...options,
                fakeWaitHoursMultiplier
            }));
        },

        async fetchAndLockSteps(limit: number): Promise<{
            steps: AutomationStepToRun[],
            nextStepReadyAt: null | Date;
        }> {
            return await knex.transaction(trx => fetchAndLockSteps(trx, limit));
        },

        async finishStepAndEnqueueNext(step: AutomationStepToRun): Promise<Date | null> {
            return await knex.transaction(trx => finishStepAndEnqueueNext(trx, {
                step,
                fakeWaitHoursMultiplier
            }));
        },

        async markStepTerminal(step: AutomationStepToRun, status: AutomationStepTerminalStatus): Promise<boolean> {
            return await knex.transaction(trx => markStepTerminal(trx, step, status));
        },

        async retryStep(step: AutomationStepToRun, retryAt: Date): Promise<boolean> {
            return await knex.transaction(trx => retryStep(trx, step, retryAt));
        }
    };
}

async function ensureDefaultAutomations(trx: Knex.Transaction): Promise<void> {
    for (const defaults of DEFAULT_WELCOME_EMAIL_AUTOMATIONS) {
        const automation = await ensureAutomation(trx, defaults);
        await ensureWelcomeEmailAction(trx, automation.id);
    }
}

async function ensureAutomation(
    trx: Knex.Transaction,
    defaults: Readonly<{name: string; slug: string}>
): Promise<AutomationRow> {
    const now = toDatabaseDate(new Date());
    const id = ObjectId().toHexString();

    await trx('automations')
        .insert({
            id,
            status: 'inactive',
            name: defaults.name,
            slug: defaults.slug,
            created_at: now,
            updated_at: now
        })
        .onConflict('slug')
        .ignore();

    return requireAutomation(await loadAutomationBySlug(trx, defaults.slug), defaults.slug);
}

async function ensureWelcomeEmailAction(trx: Knex.Transaction, automationId: string): Promise<void> {
    const hasActions = await trx('automation_actions')
        .where('automation_id', automationId)
        .whereNull('deleted_at')
        .first('id');
    if (hasActions) {
        return;
    }

    await trx('automations')
        .select('id')
        .where('id', automationId)
        .forUpdate()
        .first();

    const email = await trx('welcome_email_automated_emails')
        .select('subject', 'lexical', 'email_design_setting_id')
        .where('welcome_email_automation_id', automationId)
        .orderBy([
            'created_at',
            'id'
        ])
        .first();

    if (!email) {
        return;
    }

    const now = toDatabaseDate(new Date());
    const actionId = ObjectId().toHexString();

    await insertActions(trx, [{
        id: actionId,
        created_at: now,
        updated_at: now,
        automation_id: automationId,
        type: 'send_email'
    }]);
    await insertActionRevisions(trx, [{
        actionId,
        action: {
            id: actionId,
            type: 'send_email',
            data: {
                email_subject: email.subject,
                email_lexical: email.lexical ?? '',
                email_design_setting_id: email.email_design_setting_id
            }
        },
        createdAt: getNextRevisionCreatedAt(null, now)
    }]);
}

async function trigger(trx: Knex.Transaction, options: Readonly<{
    memberEmail: string;
    memberId: string;
    memberStatus: 'free' | 'paid';
    fakeWaitHoursMultiplier: number | null;
}>): Promise<void> {
    const {
        memberEmail,
        memberId,
        memberStatus,
        fakeWaitHoursMultiplier
    } = options;

    const firstAction = await findFirstActionRevision(trx, memberStatus);
    if (!firstAction) {
        return;
    }

    const now = new Date();
    const nowString = toDatabaseDate(now);

    const readyAt = getReadyAtForAction(firstAction, now, fakeWaitHoursMultiplier);

    const run = {
        id: ObjectId().toHexString(),
        created_at: nowString,
        updated_at: nowString,
        automation_id: firstAction.automation_id,
        member_id: memberId,
        member_email: memberEmail
    };

    await trx('automation_runs').insert(run);
    await insertRunStep(trx, {
        automationRunId: run.id,
        automationActionRevisionId: firstAction.automation_action_revision_id,
        now,
        readyAt
    });
}

async function insertRunStep(trx: Knex.Transaction, {
    automationRunId,
    automationActionRevisionId,
    now,
    readyAt
}: ReadonlyDeep<{
    automationRunId: string;
    automationActionRevisionId: string;
    now: Date;
    readyAt: Date;
}>): Promise<void> {
    const nowString = toDatabaseDate(now);

    await trx('automation_run_steps').insert({
        id: ObjectId().toHexString(),
        created_at: nowString,
        updated_at: nowString,
        automation_run_id: automationRunId,
        automation_action_revision_id: automationActionRevisionId,
        ready_at: toDatabaseDate(readyAt)
    });
}

async function fetchAndLockSteps(trx: Knex.Transaction, limit: number): Promise<{
    steps: AutomationStepToRun[],
    nextStepReadyAt: null | Date;
}> {
    // Two things make this tricky:
    //
    // - We want to do row-level locking, so multiple calls don't step on each other.
    // - We can't `UPDATE` a fixed number of rows.
    //
    // To get around these problems, here's what we do:
    //
    // 1. Select up to `limit` candidate rows.
    // 2. Try to lock those rows.
    // 3. Select any rows we successfully locked.

    const now = new Date();
    const nowString = toDatabaseDate(now);
    const staleLockCutoff = getStaleLockCutoff(now);
    const staleLockCutoffString = toDatabaseDate(staleLockCutoff);
    const lockId = crypto.randomUUID();

    // 1. Select up to `limit` candidate rows.
    const candidates: ReadonlyArray<{id: string}> = await trx('automation_run_steps')
        .select('id')
        .where('status', 'pending')
        .where('ready_at', '<=', nowString)
        .where((builder) => {
            builder
                .whereNull('locked_by')
                .orWhere('locked_at', '<', staleLockCutoffString);
        })
        .orderBy([
            'ready_at',
            'created_at',
            'id'
        ])
        .limit(limit);
    if (candidates.length === 0) {
        return {
            steps: [],
            nextStepReadyAt: await findNextPendingReadyAt(trx, staleLockCutoff)
        };
    }

    const candidateIds = candidates.map(candidate => candidate.id);

    // 2. Try to lock those rows.
    await trx('automation_run_steps')
        .update({
            locked_by: lockId,
            locked_at: nowString,
            started_at: nowString,
            updated_at: nowString
        })
        .increment('step_attempts', 1)
        .whereIn('id', candidateIds)
        .where('status', 'pending')
        .where('ready_at', '<=', nowString)
        .where((builder) => {
            builder
                .whereNull('locked_by')
                .orWhere('locked_at', '<', staleLockCutoffString);
        });

    // 3. Select any rows we successfully locked.
    const rows: StepToRunRow[] = await trx('automation_run_steps as step')
        .select(
            'step.id as id',
            'step.locked_by as locked_by',
            'step.automation_run_id as automation_run_id',
            'run.automation_id as automation_id',
            'automation.slug as automation_slug',
            'automation.status as automation_status',
            'run.member_id as member_id',
            'run.member_email as member_email',
            'action.id as action_id',
            'revision.id as automation_action_revision_id',
            'action.type as type',
            'step.ready_at as ready_at',
            'step.step_attempts as step_attempts',
            'revision.wait_hours as wait_hours',
            'revision.email_subject as email_subject',
            'revision.email_lexical as email_lexical',
            'revision.email_design_setting_id as email_design_setting_id'
        )
        .innerJoin('automation_runs as run', 'run.id', 'step.automation_run_id')
        .innerJoin('automations as automation', 'automation.id', 'run.automation_id')
        .innerJoin('automation_action_revisions as revision', 'revision.id', 'step.automation_action_revision_id')
        .innerJoin('automation_actions as action', 'action.id', 'revision.action_id')
        .where('step.locked_by', lockId)
        .orderBy([
            'step.ready_at',
            'step.created_at',
            'step.id'
        ]);

    return {
        steps: rows.map(row => buildStepToRun(row)),
        nextStepReadyAt: await findNextPendingReadyAt(trx, staleLockCutoff)
    };
}

async function findNextPendingReadyAt(trx: Knex.Transaction, staleLockCutoff: Readonly<Date>): Promise<Date | null> {
    const row = await trx('automation_run_steps')
        .min({next_ready_at: 'ready_at'})
        .where('status', 'pending')
        .where((builder) => {
            builder
                .whereNull('locked_by')
                .orWhere('locked_at', '<', toDatabaseDate(staleLockCutoff));
        })
        .first();
    return row?.next_ready_at ? new Date(row.next_ready_at) : null;
}

function buildStepToRun(row: ReadonlyDeep<StepToRunRow>): AutomationStepToRun {
    const base = {
        id: row.id,
        step_attempts: row.step_attempts,
        ready_at: new Date(row.ready_at),
        locked_by: row.locked_by,
        automation_run_id: row.automation_run_id,
        automation_id: row.automation_id,
        automation_slug: row.automation_slug,
        automation_status: row.automation_status,
        member_id: row.member_id,
        member_email: row.member_email,
        action_id: row.action_id,
        automation_action_revision_id: row.automation_action_revision_id
    };

    switch (row.type) {
    case 'wait':
        return {
            ...base,
            type: 'wait',
            wait_hours: requireValue(row, 'wait_hours')
        };
    case 'send_email':
        return {
            ...base,
            type: 'send_email',
            email_subject: requireValue(row, 'email_subject'),
            email_lexical: requireValue(row, 'email_lexical'),
            email_design_setting_id: row.email_design_setting_id
        };
    default:
        throw new errors.InternalServerError({
            message: `Unexpected action type from database: ${row.type}`
        });
    }
}

async function findFirstActionRevision(trx: Knex.Transaction, memberStatus: 'free' | 'paid'): Promise<NextActionRevisionRow | null> {
    const automationSlug: NonNullable<string> = MEMBER_WELCOME_EMAIL_SLUGS[memberStatus];

    const row = await trx('automations as automation')
        .select(
            'automation.id as automation_id',
            'actions.id as action_id',
            'revisions.id as automation_action_revision_id',
            'actions.type as type',
            'revisions.wait_hours as wait_hours'
        )
        .innerJoin('automation_actions as actions', 'actions.automation_id', 'automation.id')
        .innerJoin('automation_action_revisions as revisions', 'revisions.action_id', 'actions.id')
        .where('automation.slug', automationSlug)
        .where('automation.status', 'active')
        .whereNull('actions.deleted_at')
        .whereNotExists(trx('automation_action_edges as edge')
            .select('edge.target_action_id')
            .innerJoin('automation_actions as source_actions', 'source_actions.id', 'edge.source_action_id')
            .whereNull('source_actions.deleted_at')
            .where('edge.target_action_id', trx.ref('actions.id')))
        .where('revisions.created_at', trx('automation_action_revisions')
            .max('created_at')
            .where('action_id', trx.ref('actions.id')))
        .orderBy([
            'actions.created_at',
            'actions.id'
        ])
        .first();

    return row ?? null;
}

async function finishStepAndEnqueueNext(
    trx: Knex.Transaction,
    options: Readonly<{
        step: Pick<AutomationStepToRun, 'id' | 'locked_by' | 'action_id' | 'automation_run_id'>;
        fakeWaitHoursMultiplier: number | null;
    }>
): Promise<Date | null> {
    const {
        step,
        fakeWaitHoursMultiplier
    } = options;

    const didFinish = await markStepTerminal(trx, step, 'finished');
    if (!didFinish) {
        return null;
    }

    if (!await isRunAutomationActive(trx, step.automation_run_id)) {
        return null;
    }

    const next = await findNextActionRevision(trx, step.action_id);

    if (!next) {
        return null;
    }

    const now = new Date();
    const nextReadyAt = getReadyAtForAction(next, now, fakeWaitHoursMultiplier);

    await insertRunStep(trx, {
        automationRunId: step.automation_run_id,
        automationActionRevisionId: next.automation_action_revision_id,
        now,
        readyAt: nextReadyAt
    });

    return nextReadyAt;
}

async function findNextActionRevision(trx: Knex.Transaction, sourceActionId: string): Promise<NextActionRevisionRow | null> {
    const row = await trx('automation_action_edges as edge')
        .select(
            'action.id as action_id',
            'revision.id as automation_action_revision_id',
            'action.type as type',
            'revision.wait_hours as wait_hours'
        )
        .innerJoin('automation_actions as action', 'action.id', 'edge.target_action_id')
        .innerJoin('automation_action_revisions as revision', 'revision.action_id', 'action.id')
        .where('edge.source_action_id', sourceActionId)
        .whereNull('action.deleted_at')
        .where('revision.created_at', trx('automation_action_revisions')
            .max('created_at')
            .where('action_id', trx.ref('action.id')))
        .orderBy('revision.created_at', 'desc')
        .orderBy('revision.id', 'desc')
        .first();

    return row ?? null;
}

async function markStepTerminal(
    trx: Knex.Transaction,
    step: Pick<AutomationStepToRun, 'id' | 'locked_by'>,
    status: AutomationStepTerminalStatus
): Promise<boolean> {
    const nowString = toDatabaseDate(new Date());
    return await updateStep(trx, step, {
        status,
        finished_at: nowString,
        updated_at: nowString
    });
}

async function retryStep(
    trx: Knex.Transaction,
    step: Pick<AutomationStepToRun, 'id' | 'locked_by'>,
    retryAt: Readonly<Date>
): Promise<boolean> {
    if (!await isStepRunAutomationActive(trx, step.id)) {
        await markStepTerminal(trx, step, 'automation disabled');
        return false;
    }

    const nowString = toDatabaseDate(new Date());
    return await updateStep(trx, step, {
        status: 'pending',
        started_at: null,
        finished_at: null,
        ready_at: toDatabaseDate(retryAt),
        updated_at: nowString
    });
}

function getReadyAtForAction(
    action: ReadonlyDeep<Pick<NextActionRevisionRow, 'action_id' | 'type' | 'wait_hours'>>,
    now: Readonly<Date>,
    fakeWaitHoursMultiplier: number | null
): Date {
    switch (action.type) {
    case 'wait': {
        const waitHours = requireValue({
            ...action,
            id: action.action_id
        }, 'wait_hours');
        const waitMs = waitHours * (fakeWaitHoursMultiplier || HOUR_MS);
        return new Date(now.getTime() + waitMs);
    }
    case 'send_email':
        return now;
    default: {
        const _exhaustive: never = action.type;
        throw new errors.IncorrectUsageError({
            message: `Unexpected action type ${_exhaustive}`
        });
    }
    }
}

async function cancelCancelablePendingStepsForAutomation(
    trx: Knex.Transaction,
    automationId: string,
    now: Readonly<Date>
): Promise<void> {
    const nowString = toDatabaseDate(now);
    const staleLockCutoff = toDatabaseDate(getStaleLockCutoff(now));
    await trx('automation_run_steps')
        .update({
            status: 'automation disabled',
            finished_at: nowString,
            updated_at: nowString,
            locked_by: null,
            locked_at: null
        })
        .where('status', 'pending')
        .whereIn('automation_run_id', trx('automation_runs')
            .select('id')
            .where('automation_id', automationId))
        .where((builder) => {
            builder
                .whereNull('locked_by')
                .orWhere('locked_at', '<', staleLockCutoff);
        });
}

async function isStepRunAutomationActive(trx: Knex.Transaction, stepId: string): Promise<boolean> {
    const query = trx('automation_run_steps as step')
        .select(trx.raw('1'))
        .innerJoin('automation_runs as run', 'run.id', 'step.automation_run_id')
        .innerJoin('automations as automation', 'automation.id', 'run.automation_id')
        .where('step.id', stepId)
        .where('automation.status', 'active');
    return await selectExists(trx, query);
}

async function isRunAutomationActive(trx: Knex.Transaction, automationRunId: string): Promise<boolean> {
    const query = trx('automation_runs as run')
        .select(trx.raw('1'))
        .innerJoin('automations as automation', 'automation.id', 'run.automation_id')
        .where('run.id', automationRunId)
        .where('automation.status', 'active');
    return await selectExists(trx, query);
}

async function selectExists(trx: Knex.Transaction, query: Knex.QueryBuilder): Promise<boolean> {
    const row = await trx
        .select<{exists: boolean | number | string}>(trx.raw('exists ? as `exists`', [query]))
        .first();
    return Boolean(Number(row?.exists));
}

/**
 * Update a step. Returns whether the update succeeded.
 *
 * Should only update locked steps to avoid race conditions. Imagine the following scenario:
 *
 * 1. A step is locked by Worker A.
 * 2. The lock expires.
 * 3. The step is locked by Worker B.
 * 4. Worker A finishes its work.
 *
 * Worker A has lost its lock, so it shouldn't be updating the step any more.
 */
async function updateStep(
    trx: Knex.Transaction,
    step: Pick<AutomationStepToRun, 'id' | 'locked_by'>,
    attrs: {
        status: string;
        started_at?: string | null;
        finished_at?: string | null;
        ready_at?: string;
        updated_at: string;
    }
): Promise<boolean> {
    /* eslint-disable camelcase */
    const {started_at, finished_at, ready_at} = attrs;
    const changes = await trx('automation_run_steps')
        .update({
            status: attrs.status,
            updated_at: attrs.updated_at,
            locked_by: null,
            locked_at: null,
            ...(started_at === undefined ? {} : {started_at}),
            ...(finished_at === undefined ? {} : {finished_at}),
            ...(ready_at === undefined ? {} : {ready_at})
        })
        .where('id', step.id)
        .where('status', 'pending')
        .where('locked_by', step.locked_by);
    /* eslint-enable camelcase */
    return changes >= 1;
}

async function loadAutomation(trx: Knex.Transaction, automationId: string): Promise<AutomationRow | null> {
    const row = await trx('automations')
        .select('id', 'slug', 'name', 'status', 'created_at', 'updated_at')
        .where('id', automationId)
        .first();
    return row ?? null;
}

async function loadAutomationBySlug(trx: Knex.Transaction, slug: string): Promise<AutomationRow | null> {
    const row = await trx('automations')
        .select('id', 'slug', 'name', 'status', 'created_at', 'updated_at')
        .where('slug', slug)
        .first();
    return row ?? null;
}

async function loadAutomations(trx: Knex.Transaction): Promise<AutomationRow[]> {
    return await trx('automations')
        .select('id', 'slug', 'name', 'status', 'created_at', 'updated_at')
        .orderBy('name');
}

async function updateAutomation(trx: Knex.Transaction, automation: AutomationRow): Promise<AutomationRow> {
    await trx('automations')
        .update({
            status: automation.status,
            updated_at: automation.updated_at
        })
        .where('id', automation.id);

    return requireAutomation(await loadAutomation(trx, automation.id), automation.id);
}

async function replaceAutomationGraph(trx: Knex.Transaction, automationId: string, submittedActions: AutomationAction[], edges: AutomationEdge[]): Promise<void> {
    const existingActions = await loadAutomationActionRows(trx, automationId);
    const existingActionById = new Map(existingActions.map(action => [action.id, action]));
    const actions = await resolveEmailDesignSettingIds(trx, submittedActions);
    const submittedActionIds = new Set(actions.map(action => action.id));
    const actionIdsWithOwners = await loadActionIdsWithOwners(trx, [...submittedActionIds]);
    const latestRevisionByActionId = new Map((await loadLatestActionRevisions(trx, [...submittedActionIds])).map(revision => [revision.action_id, revision]));
    const now = toDatabaseDate(new Date());
    const actionsToInsert: ActionToInsert[] = [];
    const revisionsToInsert: ActionRevisionToInsert[] = [];

    for (const action of actions) {
        const existingAction = existingActionById.get(action.id);
        if (existingAction) {
            if (existingAction.type !== action.type) {
                throw new errors.ValidationError({
                    message: tpl(messages.conflictingAutomationActionType, {
                        actionId: action.id
                    }),
                    property: 'actions.type'
                });
            }
        } else {
            if (actionIdsWithOwners.has(action.id)) {
                throw new errors.ValidationError({
                    message: tpl(messages.conflictingAutomationActionId, {
                        actionId: action.id
                    }),
                    property: 'actions.id'
                });
            }

            actionsToInsert.push({
                id: action.id,
                created_at: now,
                updated_at: now,
                automation_id: automationId,
                type: action.type
            });
        }

        const latestRevision = latestRevisionByActionId.get(action.id);
        if (shouldInsertActionRevision(action, latestRevision)) {
            revisionsToInsert.push({
                actionId: action.id,
                action,
                createdAt: getNextRevisionCreatedAt(latestRevision?.created_at ?? null, now)
            });
        }
    }

    await insertActions(trx, actionsToInsert);
    await insertActionRevisions(trx, revisionsToInsert);

    const actionIdsToSoftDelete = existingActions
        .filter(existingAction => !submittedActionIds.has(existingAction.id))
        .map(existingAction => existingAction.id);
    await softDeleteActions(trx, actionIdsToSoftDelete, now);

    await deleteAutomationEdges(trx, automationId);

    await insertActionEdges(trx, edges);
}

async function resolveEmailDesignSettingIds(trx: Knex.Transaction, actions: ReadonlyArray<AutomationAction>): Promise<AutomationAction[]> {
    if (!actions.some(action => action.type === 'send_email' && action.data.email_design_setting_id === DEFAULT_EMAIL_DESIGN_SETTING_REFERENCE)) {
        return [...actions];
    }

    const defaultEmailDesignSettingId = await loadDefaultEmailDesignSettingId(trx);

    return actions.map((action) => {
        if (action.type !== 'send_email' || action.data.email_design_setting_id !== DEFAULT_EMAIL_DESIGN_SETTING_REFERENCE) {
            return action;
        }

        return {
            ...action,
            data: {
                ...action.data,
                email_design_setting_id: defaultEmailDesignSettingId
            }
        };
    });
}

async function loadDefaultEmailDesignSettingId(trx: Knex.Transaction): Promise<string> {
    const row = await trx('email_design_settings')
        .select('id')
        .where('slug', DEFAULT_EMAIL_DESIGN_SETTING_SLUG)
        .first();

    if (!row?.id) {
        throw new errors.InternalServerError({
            message: tpl(messages.defaultEmailDesignSettingNotFound)
        });
    }

    return row.id;
}

async function loadAutomationActionRows(trx: Knex.Transaction, automationId: string): Promise<Array<Pick<ActionRow, 'id' | 'type'>>> {
    return await trx('automation_actions')
        .select('id', 'type')
        .where('automation_id', automationId)
        .whereNull('deleted_at');
}

async function loadActionIdsWithOwners(trx: Knex.Transaction, actionIds: ReadonlyArray<string>): Promise<Set<string>> {
    if (actionIds.length === 0) {
        return new Set();
    }
    const rows = await trx('automation_actions')
        .select('id')
        .whereIn('id', actionIds);
    return new Set(rows.map(row => row.id));
}

async function insertActions(trx: Knex.Transaction, actions: ReadonlyArray<ActionToInsert>): Promise<void> {
    if (actions.length === 0) {
        return;
    }
    await trx('automation_actions').insert(actions);
}

function shouldInsertActionRevision(action: AutomationAction, latestRevision: ActionRevisionRow | undefined): boolean {
    if (!latestRevision) {
        return true;
    }

    return !dequal(buildRevisionActionData(action, latestRevision), action.data);
}

function buildRevisionActionData(action: AutomationAction, revision: ActionRevisionRow): ExclusifyUnion<WaitRevisionData | SendEmailRevisionData> {
    switch (action.type) {
    case 'wait':
        return {
            wait_hours: revision.wait_hours
        };
    case 'send_email':
        return {
            email_subject: revision.email_subject,
            email_lexical: revision.email_lexical,
            email_design_setting_id: revision.email_design_setting_id
        };
    default: {
        const _exhaustive: never = action;
        throw new errors.InternalServerError({
            message: `Unhandled action type: ${_exhaustive}`
        });
    }
    }
}

async function loadLatestActionRevisions(
    trx: Knex.Transaction,
    actionIds: ReadonlyArray<string>
): Promise<ActionRevisionRow[]> {
    if (actionIds.length === 0) {
        return [];
    }

    const latestRevisionDates = trx('automation_action_revisions')
        .select('action_id')
        .max({created_at: 'created_at'})
        .whereIn('action_id', actionIds)
        .groupBy('action_id')
        .as('latest_revision_dates');

    return await trx('automation_action_revisions')
        .select(
            'automation_action_revisions.action_id',
            'automation_action_revisions.created_at',
            'automation_action_revisions.wait_hours',
            'automation_action_revisions.email_subject',
            'automation_action_revisions.email_lexical',
            'automation_action_revisions.email_design_setting_id'
        )
        .innerJoin(latestRevisionDates, function () {
            this.on('automation_action_revisions.action_id', 'latest_revision_dates.action_id')
                .andOn('automation_action_revisions.created_at', 'latest_revision_dates.created_at');
        });
}

async function softDeleteActions(
    trx: Knex.Transaction,
    actionIds: ReadonlyArray<string>,
    deletedAt: string
): Promise<void> {
    if (actionIds.length === 0) {
        return;
    }
    await trx('automation_actions')
        .update({
            deleted_at: deletedAt,
            updated_at: deletedAt
        })
        .whereIn('id', actionIds);
}

async function insertActionRevisions(
    trx: Knex.Transaction,
    revisions: ReadonlyArray<ActionRevisionToInsert>
): Promise<void> {
    if (revisions.length === 0) {
        return;
    }
    await trx('automation_action_revisions').insert(
        revisions.map(({actionId, action, createdAt}) => buildActionRevision(actionId, action, createdAt))
    );
}

function getNextRevisionCreatedAt(latestCreatedAt: string | null, requestedCreatedAt: string) {
    if (!latestCreatedAt) {
        return toDatabaseDate(requestedCreatedAt);
    }

    // Parse the stored database date strings with moment so that parsing and
    // formatting share the same timezone. Using `new Date(string)` here would
    // interpret the naive (timezone-less) database string as local time while
    // toDatabaseDate formats in UTC, shifting the timestamp by the offset.
    const requestedTime = moment(requestedCreatedAt).valueOf();
    const latestTime = moment(latestCreatedAt).valueOf();

    if (requestedTime > latestTime) {
        return toDatabaseDate(requestedCreatedAt);
    }

    return toDatabaseDate(moment(latestTime + 1000).toDate());
}

function buildActionRevision(actionId: string, action: AutomationAction, createdAt: string) {
    switch (action.type) {
    case 'wait':
        return {
            id: ObjectId().toString(),
            created_at: createdAt,
            action_id: actionId,
            wait_hours: action.data.wait_hours,
            email_subject: null,
            email_lexical: null,
            email_design_setting_id: null
        };
    case 'send_email':
        return {
            id: ObjectId().toString(),
            created_at: createdAt,
            action_id: actionId,
            wait_hours: null,
            email_subject: action.data.email_subject,
            email_lexical: action.data.email_lexical,
            email_design_setting_id: action.data.email_design_setting_id
        };
    default: {
        const _exhaustive: never = action;
        throw new errors.InternalServerError({
            message: `Unexpected action type ${_exhaustive}`
        });
    }
    }
}

async function deleteAutomationEdges(trx: Knex.Transaction, automationId: string): Promise<void> {
    await trx('automation_action_edges')
        .delete()
        .whereIn('source_action_id', trx('automation_actions')
            .select('id')
            .where('automation_id', automationId));
}

async function insertActionEdges(trx: Knex.Transaction, edges: ReadonlyArray<AutomationEdge>): Promise<void> {
    if (edges.length === 0) {
        return;
    }
    await trx('automation_action_edges').insert(edges.map(edge => ({
        source_action_id: edge.source_action_id,
        target_action_id: edge.target_action_id
    })));
}

function requireAutomation(automation: AutomationRow | null, id: string): AutomationRow {
    if (!automation) {
        throw new errors.InternalServerError({
            message: `Updated automation "${id}" could not be loaded.`
        });
    }

    return automation;
}

async function buildAutomation(trx: Knex.Transaction, automation: AutomationRow): Promise<Automation> {
    const actionRows = await loadActionRows(trx, automation.id);
    const edgeRows = await loadEdgeRows(trx, automation.id);
    return {
        ...buildAutomationSummary(automation),
        actions: actionRows.map(row => buildActionPayload(row)),
        edges: edgeRows.map(row => buildEdgePayload(row))
    };
}

function buildAutomationSummary(automation: AutomationRow): AutomationSummary {
    return {
        id: automation.id,
        slug: automation.slug,
        name: automation.name,
        status: automation.status,
        created_at: serializeDate(automation.created_at),
        updated_at: serializeDate(automation.updated_at)
    };
}

function serializeDate(date: string) {
    const normalizedDate = new Date(date);
    normalizedDate.setMilliseconds(0);
    return normalizedDate.toISOString();
}

async function loadActionRows(trx: Knex.Transaction, automationId: string): Promise<ActionRow[]> {
    return await trx('automation_actions as a')
        .select(
            'a.id as id',
            'a.type as type',
            'r.wait_hours as wait_hours',
            'r.email_subject as email_subject',
            'r.email_lexical as email_lexical',
            'r.email_design_setting_id as email_design_setting_id'
        )
        .innerJoin('automation_action_revisions as r', 'r.action_id', 'a.id')
        .where('a.automation_id', automationId)
        .whereNull('a.deleted_at')
        .where('r.created_at', trx('automation_action_revisions')
            .max('created_at')
            .where('action_id', trx.ref('a.id')))
        .orderBy([
            'a.created_at',
            'a.id'
        ]);
}

async function loadEdgeRows(trx: Knex.Transaction, automationId: string): Promise<EdgeRow[]> {
    return await trx('automation_action_edges as e')
        .select('e.source_action_id', 'e.target_action_id')
        .innerJoin('automation_actions as source_action', (join) => {
            join
                .on('source_action.id', 'e.source_action_id')
                .onNull('source_action.deleted_at');
        })
        .innerJoin('automation_actions as target_action', (join) => {
            join
                .on('target_action.id', 'e.target_action_id')
                .onNull('target_action.deleted_at')
                .on('target_action.automation_id', 'source_action.automation_id');
        })
        .where('source_action.automation_id', automationId)
        .orderBy([
            'e.source_action_id',
            'e.target_action_id'
        ]);
}

function buildActionPayload(row: ActionRow): AutomationAction {
    switch (row.type) {
    case 'wait':
        return {
            id: row.id,
            type: 'wait',
            data: {
                wait_hours: requireValue(row, 'wait_hours')
            }
        };
    case 'send_email':
        return {
            id: row.id,
            type: 'send_email',
            data: {
                email_subject: requireValue(row, 'email_subject'),
                email_lexical: requireValue(row, 'email_lexical'),
                email_design_setting_id: requireValue(row, 'email_design_setting_id')
            }
        };
    }
}

function requireValue<
    RowT extends {id: string, type: string},
    FieldT extends keyof RowT
>(
    row: RowT,
    field: FieldT
): NonNullable<RowT[FieldT]> {
    const value = row[field];
    if ((value === null) || (value === undefined)) {
        throw new errors.InternalServerError({
            message: tpl(messages.invalidAutomationActionRevision, {
                actionId: row.id,
                actionType: row.type,
                field
            })
        });
    }
    return value;
}

function buildEdgePayload(edge: EdgeRow): AutomationEdge {
    return {
        source_action_id: edge.source_action_id,
        target_action_id: edge.target_action_id
    };
}

function buildPagination(total: number) {
    return {
        page: 1,
        pages: 1,
        limit: 'all' as const,
        total,
        prev: null,
        next: null
    };
}
