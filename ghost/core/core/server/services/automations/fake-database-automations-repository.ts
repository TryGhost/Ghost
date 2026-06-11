import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import crypto from 'node:crypto';
import ObjectId from 'bson-objectid';
import {dequal} from 'dequal';
import knex, {type Knex} from 'knex';
import type {DatabaseSync, SQLInputValue} from 'node:sqlite';
import {MEMBER_WELCOME_EMAIL_SLUGS} from '../member-welcome-emails/constants';
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
import {LOCK_TIMEOUT_MS} from './constants';
import type {ExclusifyUnion, ReadonlyDeep} from 'type-fest';

const HOUR_MS = 60 * 60 * 1000;
const queryBuilder = knex({client: 'sqlite', useNullAsDefault: true});

const messages = {
    invalidAutomationActionRevision: 'Automation action "{actionId}" of type "{actionType}" is missing required revision field "{field}".',
    conflictingAutomationActionId: 'Automation action "{actionId}" already exists and cannot be inserted.',
    conflictingAutomationActionType: 'Automation action "{actionId}" already exists with a different type.'
};

interface AutomationRow {
    id: string;
    slug: string;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
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

function toNativeQuery(builder: Knex.QueryBuilder) {
    const {sql, bindings} = builder.toSQL().toNative();
    return {
        sql,
        bindings: bindings as SQLInputValue[]
    };
}

function getRow(database: DatabaseSync, builder: Knex.QueryBuilder) {
    const {sql, bindings} = toNativeQuery(builder);
    return database.prepare(sql).get(...bindings);
}

function getRows(database: DatabaseSync, builder: Knex.QueryBuilder) {
    const {sql, bindings} = toNativeQuery(builder);
    return database.prepare(sql).all(...bindings);
}

function runQuery(database: DatabaseSync, builder: Knex.QueryBuilder) {
    const {sql, bindings} = toNativeQuery(builder);
    return database.prepare(sql).run(...bindings);
}

export function createFakeDatabaseAutomationsRepository({
    getDatabase
}: {
    getDatabase: () => DatabaseSync;
}): AutomationsRepository {
    return {
        async browse(): Promise<Page<AutomationSummary>> {
            const database = getDatabase();

            return withTransaction(database, () => {
                const rows = loadAutomations(database).map(row => buildAutomationSummary(row));

                return {
                    data: rows,
                    meta: {
                        pagination: buildPagination(rows.length)
                    }
                };
            });
        },

        async getById(id: string): Promise<Automation | null> {
            const database = getDatabase();
            return withTransaction(database, () => {
                const automation = loadAutomation(database, id);

                if (!automation) {
                    return null;
                }

                return buildAutomation(database, automation);
            });
        },

        async edit(id: string, data: EditAutomationData): Promise<Automation | null> {
            const database = getDatabase();

            return withTransaction(database, () => {
                const automation = loadAutomation(database, id);

                if (!automation) {
                    return null;
                }

                const updatedAutomation = updateAutomation(database, {
                    ...automation,
                    status: data.status,
                    updated_at: new Date().toISOString()
                });

                replaceAutomationGraph(database, updatedAutomation.id, data.actions, data.edges);

                return buildAutomation(database, updatedAutomation);
            });
        },

        async trigger(options: {
            memberEmail: string;
            memberId: string;
            memberStatus: 'free' | 'paid';
        }): Promise<void> {
            const database = getDatabase();

            return withTransaction(database, () => trigger(database, options));
        },

        async fetchAndLockSteps(limit: number): Promise<{
            steps: AutomationStepToRun[],
            nextStepReadyAt: null | Date;
        }> {
            const database = getDatabase();

            return withTransaction(database, () => fetchAndLockSteps(database, limit));
        },

        async finishStepAndEnqueueNext(step: AutomationStepToRun): Promise<Date | null> {
            const database = getDatabase();

            return withTransaction(database, () => finishStepAndEnqueueNext(database, step));
        },

        async markStepTerminal(step: AutomationStepToRun, status: AutomationStepTerminalStatus): Promise<boolean> {
            const database = getDatabase();

            return withTransaction(database, () => markStepTerminal(database, step, status));
        },

        async retryStep(step: AutomationStepToRun, retryAt: Date): Promise<boolean> {
            const database = getDatabase();

            return withTransaction(database, () => retryStep(database, step, retryAt));
        }
    };
}

function withTransaction<T>(database: DatabaseSync, operation: () => T): T {
    database.exec('BEGIN TRANSACTION');

    try {
        const result = operation();
        database.exec('COMMIT');
        return result;
    } catch (error) {
        database.exec('ROLLBACK');
        throw error;
    }
}

function trigger(database: DatabaseSync, {
    memberEmail,
    memberId,
    memberStatus
}: Readonly<{
    memberEmail: string;
    memberId: string;
    memberStatus: 'free' | 'paid';
}>): void {
    const firstAction = findFirstActionRevision(database, memberStatus);
    if (!firstAction) {
        return;
    }

    const now = new Date();
    const nowString = now.toISOString();

    const readyAt = getReadyAtForAction(firstAction, now);

    const run = {
        id: ObjectId().toHexString(),
        created_at: nowString,
        updated_at: nowString,
        automation_id: firstAction.automation_id,
        member_id: memberId,
        member_email: memberEmail
    };

    runQuery(database, queryBuilder('automation_runs').insert(run));
    insertRunStep(database, {
        automationRunId: run.id,
        automationActionRevisionId: firstAction.automation_action_revision_id,
        now,
        readyAt
    });
}

function insertRunStep(database: DatabaseSync, {
    automationRunId,
    automationActionRevisionId,
    now,
    readyAt
}: ReadonlyDeep<{
    automationRunId: string;
    automationActionRevisionId: string;
    now: Date;
    readyAt: Date;
}>): void {
    const nowString = now.toISOString();

    runQuery(database, queryBuilder('automation_run_steps').insert({
        id: ObjectId().toHexString(),
        created_at: nowString,
        updated_at: nowString,
        automation_run_id: automationRunId,
        automation_action_revision_id: automationActionRevisionId,
        ready_at: readyAt.toISOString()
    }));
}

function fetchAndLockSteps(database: DatabaseSync, limit: number): {
    steps: AutomationStepToRun[],
    nextStepReadyAt: null | Date;
} {
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
    const nowString = now.toISOString();
    const staleLockCutoff = new Date(now.getTime() - LOCK_TIMEOUT_MS);
    const staleLockCutoffString = staleLockCutoff.toISOString();
    const lockId = crypto.randomUUID();

    // 1. Select up to `limit` candidate rows.
    const candidates = getRows(database, queryBuilder('automation_run_steps')
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
        .limit(limit)) as unknown as ReadonlyArray<{id: string}>;
    if (candidates.length === 0) {
        return {
            steps: [],
            nextStepReadyAt: findNextPendingReadyAt(database, staleLockCutoff)
        };
    }

    const candidateIds = candidates.map(candidate => candidate.id);

    // 2. Try to lock those rows.
    runQuery(database, queryBuilder('automation_run_steps')
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
        }));

    // 3. Select any rows we successfully locked.
    const rows = getRows(database, queryBuilder('automation_run_steps as step')
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
        ])) as unknown as StepToRunRow[];

    return {
        steps: rows.map(row => buildStepToRun(row)),
        nextStepReadyAt: findNextPendingReadyAt(database, staleLockCutoff)
    };
}

function findNextPendingReadyAt(database: DatabaseSync, staleLockCutoff: Readonly<Date>): Date | null {
    const row = getRow(database, queryBuilder('automation_run_steps')
        .min({next_ready_at: 'ready_at'})
        .where('status', 'pending')
        .where((builder) => {
            builder
                .whereNull('locked_by')
                .orWhere('locked_at', '<', staleLockCutoff.toISOString());
        })) as {next_ready_at: string | null} | undefined;
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

function findFirstActionRevision(database: DatabaseSync, memberStatus: 'free' | 'paid'): NextActionRevisionRow | null {
    const automationSlug: NonNullable<string> = MEMBER_WELCOME_EMAIL_SLUGS[memberStatus];

    const row = getRow(database, queryBuilder('automations as automation')
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
        .whereNotExists(queryBuilder('automation_action_edges as edge')
            .select('edge.target_action_id')
            .innerJoin('automation_actions as source_actions', 'source_actions.id', 'edge.source_action_id')
            .whereNull('source_actions.deleted_at')
            .where('edge.target_action_id', queryBuilder.ref('actions.id')))
        .where('revisions.created_at', queryBuilder('automation_action_revisions')
            .max('created_at')
            .where('action_id', queryBuilder.ref('actions.id')))
        .orderBy([
            'actions.created_at',
            'actions.id'
        ])
        .limit(1)) as NextActionRevisionRow | undefined;

    return row ?? null;
}

function finishStepAndEnqueueNext(
    database: DatabaseSync,
    step: Pick<AutomationStepToRun, 'id' | 'locked_by' | 'action_id' | 'automation_run_id'>
): Date | null {
    const didFinish = markStepTerminal(database, step, 'finished');
    if (!didFinish) {
        return null;
    }

    const next = findNextActionRevision(database, step.action_id);

    if (!next) {
        return null;
    }

    const now = new Date();
    const nextReadyAt = getReadyAtForAction(next, now);

    insertRunStep(database, {
        automationRunId: step.automation_run_id,
        automationActionRevisionId: next.automation_action_revision_id,
        now,
        readyAt: nextReadyAt
    });

    return nextReadyAt;
}

function findNextActionRevision(database: DatabaseSync, sourceActionId: string): NextActionRevisionRow | null {
    const row = getRow(database, queryBuilder('automation_action_edges as edge')
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
        .where('revision.created_at', queryBuilder('automation_action_revisions')
            .max('created_at')
            .where('action_id', queryBuilder.ref('action.id')))
        .orderBy('revision.created_at', 'desc')
        .orderBy('revision.id', 'desc')
        .limit(1)) as NextActionRevisionRow | undefined;

    return row ?? null;
}

function markStepTerminal(
    database: DatabaseSync,
    step: Pick<AutomationStepToRun, 'id' | 'locked_by'>,
    status: AutomationStepTerminalStatus
): boolean {
    const nowString = new Date().toISOString();
    return updateStep(database, step, {
        status,
        finished_at: nowString,
        updated_at: nowString
    });
}

function retryStep(
    database: DatabaseSync,
    step: Pick<AutomationStepToRun, 'id' | 'locked_by'>,
    retryAt: Readonly<Date>
): boolean {
    const nowString = new Date().toISOString();
    return updateStep(database, step, {
        status: 'pending',
        started_at: null,
        finished_at: null,
        ready_at: retryAt.toISOString(),
        updated_at: nowString
    });
}

function getReadyAtForAction(
    action: ReadonlyDeep<Pick<NextActionRevisionRow, 'action_id' | 'type' | 'wait_hours'>>,
    now: Readonly<Date>
): Date {
    switch (action.type) {
    case 'wait': {
        const waitHours = requireValue({
            ...action,
            id: action.action_id
        }, 'wait_hours');
        const waitMs = waitHours * HOUR_MS;
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
function updateStep(
    database: DatabaseSync,
    step: Pick<AutomationStepToRun, 'id' | 'locked_by'>,
    attrs: {
        status: string;
        started_at?: string | null;
        finished_at?: string | null;
        ready_at?: string;
        updated_at: string;
    }
): boolean {
    /* eslint-disable camelcase */
    const {started_at, finished_at, ready_at} = attrs;
    const result = runQuery(database, queryBuilder('automation_run_steps')
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
        .where('locked_by', step.locked_by)) as unknown as {changes: number};
    /* eslint-enable camelcase */
    return result.changes >= 1;
}

function loadAutomation(database: DatabaseSync, automationId: string): AutomationRow | null {
    const automation = getRow(database, queryBuilder('automations')
        .select('id', 'slug', 'name', 'status', 'created_at', 'updated_at')
        .where('id', automationId)) as AutomationRow | undefined;

    return automation ?? null;
}

function loadAutomations(database: DatabaseSync): AutomationRow[] {
    return getRows(database, queryBuilder('automations')
        .select('id', 'slug', 'name', 'status', 'created_at', 'updated_at')
        .orderBy([
            'created_at',
            'id'
        ])) as unknown as AutomationRow[];
}

function updateAutomation(database: DatabaseSync, automation: AutomationRow): AutomationRow {
    runQuery(database, queryBuilder('automations')
        .update({
            status: automation.status,
            updated_at: automation.updated_at
        })
        .where('id', automation.id));

    return requireAutomation(loadAutomation(database, automation.id), automation.id);
}

function replaceAutomationGraph(database: DatabaseSync, automationId: string, actions: AutomationAction[], edges: AutomationEdge[]) {
    const existingActions = loadAutomationActionRows(database, automationId);
    const existingActionIds = new Set(existingActions.map(action => action.id));
    const submittedActionIds = new Set(actions.map(action => action.id));
    const now = new Date().toISOString();

    for (const action of actions) {
        if (existingActionIds.has(action.id)) {
            const existingAction = existingActions.find(({id}) => id === action.id);

            if (existingAction?.type !== action.type) {
                throw new errors.ValidationError({
                    message: tpl(messages.conflictingAutomationActionType, {
                        actionId: action.id
                    }),
                    property: 'actions.type'
                });
            }
        } else {
            if (loadActionOwner(database, action.id)) {
                throw new errors.ValidationError({
                    message: tpl(messages.conflictingAutomationActionId, {
                        actionId: action.id
                    }),
                    property: 'actions.id'
                });
            }

            insertAction(database, {
                id: action.id,
                created_at: now,
                updated_at: now,
                automation_id: automationId,
                type: action.type
            });
        }

        const latestRevision = loadLatestActionRevision(database, action.id);
        if (shouldInsertActionRevision(action, latestRevision)) {
            insertActionRevision(database, action.id, action, now, latestRevision);
        }
    }

    for (const existingAction of existingActions) {
        if (!submittedActionIds.has(existingAction.id)) {
            softDeleteAction(database, existingAction.id, now);
        }
    }

    deleteAutomationEdges(database, automationId);

    for (const edge of edges) {
        insertActionEdge(database, edge);
    }
}

function loadAutomationActionRows(database: DatabaseSync, automationId: string): Array<Pick<ActionRow, 'id' | 'type'>> {
    return getRows(database, queryBuilder('automation_actions')
        .select('id', 'type')
        .where('automation_id', automationId)
        .whereNull('deleted_at')) as unknown as Array<Pick<ActionRow, 'id' | 'type'>>;
}

function loadActionOwner(database: DatabaseSync, actionId: string): string | null {
    const row = getRow(database, queryBuilder('automation_actions')
        .select('automation_id')
        .where('id', actionId)) as {automation_id: string} | undefined;

    return row?.automation_id ?? null;
}

function insertAction(database: DatabaseSync, action: {
    id: string;
    created_at: string;
    updated_at: string;
    automation_id: string;
    type: string;
}) {
    runQuery(database, queryBuilder('automation_actions').insert(action));
}

function shouldInsertActionRevision(action: AutomationAction, latestRevision: ActionRevisionRow | null): boolean {
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

function loadLatestActionRevision(database: DatabaseSync, actionId: string): ActionRevisionRow | null {
    const row = getRow(database, queryBuilder('automation_action_revisions')
        .select(
            'action_id',
            'created_at',
            'wait_hours',
            'email_subject',
            'email_lexical',
            'email_design_setting_id'
        )
        .where('action_id', actionId)
        .where('created_at', queryBuilder('automation_action_revisions')
            .max('created_at')
            .where('action_id', actionId))) as ActionRevisionRow | undefined;

    return row ?? null;
}

function softDeleteAction(database: DatabaseSync, actionId: string, deletedAt: string) {
    runQuery(database, queryBuilder('automation_actions')
        .update({
            deleted_at: deletedAt,
            updated_at: deletedAt
        })
        .where('id', actionId));
}

function insertActionRevision(database: DatabaseSync, actionId: string, action: AutomationAction, createdAt: string, latestRevision: ActionRevisionRow | null) {
    const revision = buildActionRevision(actionId, action, getNextRevisionCreatedAt(latestRevision?.created_at ?? null, createdAt));

    runQuery(database, queryBuilder('automation_action_revisions').insert(revision));
}

function getNextRevisionCreatedAt(latestCreatedAt: string | null, requestedCreatedAt: string) {
    if (!latestCreatedAt) {
        return requestedCreatedAt;
    }

    const requestedTime = new Date(requestedCreatedAt).getTime();
    const latestTime = new Date(latestCreatedAt).getTime();

    if (requestedTime > latestTime) {
        return requestedCreatedAt;
    }

    return new Date(latestTime + 1).toISOString();
}

function buildActionRevision(actionId: string, action: AutomationAction, createdAt: string) {
    if (action.type === 'wait') {
        return {
            id: ObjectId().toString(),
            created_at: createdAt,
            action_id: actionId,
            wait_hours: action.data.wait_hours,
            email_subject: null,
            email_lexical: null,
            email_design_setting_id: null
        };
    }

    return {
        id: ObjectId().toString(),
        created_at: createdAt,
        action_id: actionId,
        wait_hours: null,
        email_subject: action.data.email_subject,
        email_lexical: action.data.email_lexical,
        email_design_setting_id: action.data.email_design_setting_id
    };
}

function deleteAutomationEdges(database: DatabaseSync, automationId: string) {
    runQuery(database, queryBuilder('automation_action_edges')
        .delete()
        .whereIn('source_action_id', queryBuilder('automation_actions')
            .select('id')
            .where('automation_id', automationId)));
}

function insertActionEdge(database: DatabaseSync, edge: AutomationEdge) {
    runQuery(database, queryBuilder('automation_action_edges').insert({
        source_action_id: edge.source_action_id,
        target_action_id: edge.target_action_id
    }));
}

function requireAutomation(automation: AutomationRow | null, id: string): AutomationRow {
    if (!automation) {
        throw new errors.InternalServerError({
            message: `Updated automation "${id}" could not be loaded.`
        });
    }

    return automation;
}

function buildAutomation(database: DatabaseSync, automation: AutomationRow): Automation {
    return {
        ...buildAutomationSummary(automation),
        actions: loadActionRows(database, automation.id).map(row => buildActionPayload(row)),
        edges: loadEdgeRows(database, automation.id).map(row => buildEdgePayload(row))
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

function loadActionRows(database: DatabaseSync, automationId: string): ActionRow[] {
    return getRows(database, queryBuilder('automation_actions as a')
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
        .where('r.created_at', queryBuilder('automation_action_revisions')
            .max('created_at')
            .where('action_id', queryBuilder.ref('a.id')))
        .orderBy([
            'a.created_at',
            'a.id'
        ])) as unknown as ActionRow[];
}

function loadEdgeRows(database: DatabaseSync, automationId: string): EdgeRow[] {
    return getRows(database, queryBuilder('automation_action_edges as e')
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
        ])) as unknown as EdgeRow[];
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
