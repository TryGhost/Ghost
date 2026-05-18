import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import ObjectId from 'bson-objectid';
import type {DatabaseSync} from 'node:sqlite';
import type {
    Automation,
    AutomationAction,
    AutomationEdge,
    AutomationSummary,
    AutomationsRepository,
    EditAutomationData,
    Page
} from './automations-repository';

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
    email_sender_name: string | null;
    email_sender_email: string | null;
    email_sender_reply_to: string | null;
    email_design_setting_id: string | null;
}

interface EdgeRow {
    source_action_id: string;
    target_action_id: string;
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

function loadAutomation(database: DatabaseSync, automationId: string): AutomationRow | null {
    const automation = database.prepare(`
        SELECT id, slug, name, status, created_at, updated_at
        FROM automations
        WHERE id = ?
    `).get(automationId) as AutomationRow | undefined;

    return automation ?? null;
}

function loadAutomations(database: DatabaseSync): AutomationRow[] {
    return database.prepare(`
        SELECT id, slug, name, status, created_at, updated_at
        FROM automations
        ORDER BY created_at, id
    `).all() as unknown as AutomationRow[];
}

function updateAutomation(database: DatabaseSync, automation: AutomationRow): AutomationRow {
    database.prepare(`
        UPDATE automations
        SET status = :status,
            updated_at = :updated_at
        WHERE id = :id
    `).run({
        id: automation.id,
        status: automation.status,
        updated_at: automation.updated_at
    });

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

        // TODO (NY-1283): Deduplicate revisions before inserting them.
        insertActionRevision(database, action.id, action, now);
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
    return database.prepare(`
        SELECT id, type
        FROM automation_actions
        WHERE automation_id = ?
            AND deleted_at IS NULL
    `).all(automationId) as unknown as Array<Pick<ActionRow, 'id' | 'type'>>;
}

function loadActionOwner(database: DatabaseSync, actionId: string): string | null {
    const row = database.prepare(`
        SELECT automation_id
        FROM automation_actions
        WHERE id = ?
    `).get(actionId) as {automation_id: string} | undefined;

    return row?.automation_id ?? null;
}

function insertAction(database: DatabaseSync, action: {
    id: string;
    created_at: string;
    updated_at: string;
    automation_id: string;
    type: string;
}) {
    database.prepare(`
        INSERT INTO automation_actions
        (id, created_at, updated_at, automation_id, type) VALUES
        (:id, :created_at, :updated_at, :automation_id, :type)
    `).run(action);
}

function softDeleteAction(database: DatabaseSync, actionId: string, deletedAt: string) {
    database.prepare(`
        UPDATE automation_actions
        SET deleted_at = :deleted_at,
            updated_at = :updated_at
        WHERE id = :id
    `).run({
        id: actionId,
        deleted_at: deletedAt,
        updated_at: deletedAt
    });
}

function insertActionRevision(database: DatabaseSync, actionId: string, action: AutomationAction, createdAt: string) {
    const revision = buildActionRevision(actionId, action, getNextRevisionCreatedAt(database, actionId, createdAt));

    database.prepare(`
        INSERT INTO automation_action_revisions
        (
            id,
            created_at,
            action_id,
            wait_hours,
            email_subject,
            email_lexical,
            email_sender_name,
            email_sender_email,
            email_sender_reply_to,
            email_design_setting_id
        ) VALUES (
            :id,
            :created_at,
            :action_id,
            :wait_hours,
            :email_subject,
            :email_lexical,
            :email_sender_name,
            :email_sender_email,
            :email_sender_reply_to,
            :email_design_setting_id
        )
    `).run(revision);
}

function getNextRevisionCreatedAt(database: DatabaseSync, actionId: string, requestedCreatedAt: string) {
    const row = database.prepare(`
        SELECT MAX(created_at) AS created_at
        FROM automation_action_revisions
        WHERE action_id = ?
    `).get(actionId) as {created_at: string | null} | undefined;

    if (!row?.created_at) {
        return requestedCreatedAt;
    }

    const requestedTime = new Date(requestedCreatedAt).getTime();
    const latestTime = new Date(row.created_at).getTime();

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
            email_sender_name: null,
            email_sender_email: null,
            email_sender_reply_to: null,
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
        email_sender_name: action.data.email_sender_name,
        email_sender_email: action.data.email_sender_email,
        email_sender_reply_to: action.data.email_sender_reply_to,
        email_design_setting_id: action.data.email_design_setting_id
    };
}

function deleteAutomationEdges(database: DatabaseSync, automationId: string) {
    database.prepare(`
        DELETE FROM automation_action_edges
        WHERE source_action_id IN (
            SELECT id
            FROM automation_actions
            WHERE automation_id = ?
        )
    `).run(automationId);
}

function insertActionEdge(database: DatabaseSync, edge: AutomationEdge) {
    database.prepare(`
        INSERT INTO automation_action_edges
        (source_action_id, target_action_id) VALUES
        (:source_action_id, :target_action_id)
    `).run({
        source_action_id: edge.source_action_id,
        target_action_id: edge.target_action_id
    });
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
    return database.prepare(`
        SELECT
            a.id AS id,
            a.type AS type,
            r.wait_hours AS wait_hours,
            r.email_subject AS email_subject,
            r.email_lexical AS email_lexical,
            r.email_sender_name AS email_sender_name,
            r.email_sender_email AS email_sender_email,
            r.email_sender_reply_to AS email_sender_reply_to,
            r.email_design_setting_id AS email_design_setting_id
        FROM automation_actions a
        INNER JOIN automation_action_revisions r ON r.action_id = a.id
        WHERE a.automation_id = ?
            AND a.deleted_at IS NULL
            AND r.created_at = (
                SELECT MAX(created_at)
                FROM automation_action_revisions
                WHERE action_id = a.id
            )
        ORDER BY a.created_at, a.id
    `).all(automationId) as unknown as ActionRow[];
}

function loadEdgeRows(database: DatabaseSync, automationId: string): EdgeRow[] {
    return database.prepare(`
        SELECT e.source_action_id, e.target_action_id
        FROM automation_action_edges e
        INNER JOIN automation_actions source_action ON source_action.id = e.source_action_id
            AND source_action.deleted_at IS NULL
        INNER JOIN automation_actions target_action ON target_action.id = e.target_action_id
            AND target_action.deleted_at IS NULL
            AND target_action.automation_id = source_action.automation_id
        WHERE source_action.automation_id = ?
        ORDER BY e.source_action_id, e.target_action_id
    `).all(automationId) as unknown as EdgeRow[];
}

function buildActionPayload(row: ActionRow): AutomationAction {
    switch (row.type) {
    case 'wait':
        return {
            id: row.id,
            type: 'wait',
            data: {
                wait_hours: requireValue(row.wait_hours, 'wait_hours', row)
            }
        };
    case 'send_email':
        return {
            id: row.id,
            type: 'send_email',
            data: {
                email_subject: requireValue(row.email_subject, 'email_subject', row),
                email_lexical: requireValue(row.email_lexical, 'email_lexical', row),
                email_sender_name: row.email_sender_name,
                email_sender_email: row.email_sender_email,
                email_sender_reply_to: row.email_sender_reply_to,
                email_design_setting_id: requireValue(row.email_design_setting_id, 'email_design_setting_id', row)
            }
        };
    }
}

function requireValue<T>(value: T | null, field: string, row: ActionRow): T {
    if (value === null) {
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
