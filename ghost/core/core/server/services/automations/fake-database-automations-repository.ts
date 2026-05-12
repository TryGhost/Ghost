import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import type {DatabaseSync} from 'node:sqlite';
import type {
    Automation,
    AutomationAction,
    AutomationEdge,
    AutomationSummary,
    AutomationsRepository,
    Page
} from './automations-repository';

const messages = {
    invalidAutomationActionRevision: 'Automation action "{actionId}" of type "{actionType}" is missing required revision field "{field}".'
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
        INNER JOIN automation_actions a ON a.id = e.source_action_id
            AND a.deleted_at IS NULL
        WHERE a.automation_id = ?
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
