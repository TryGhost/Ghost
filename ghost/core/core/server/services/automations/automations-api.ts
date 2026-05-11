/* eslint-disable @typescript-eslint/no-require-imports */
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import type {DatabaseSync} from 'node:sqlite';

const domainEvents = require('@tryghost/domain-events');
const StartAutomationsPollEvent = require('./events/start-automations-poll-event');
const temporaryFakeAutomationsDatabase = require('./temporary-fake-database');

const messages = {
    automationNotFound: 'Automation not found.',
    automationsDatabaseUnavailable: 'Automations database is unavailable in this environment.'
};

interface AutomationRow {
    id: string;
    slug: string;
    name: string;
    status: string;
    created_at: number;
    updated_at: number;
}

interface AutomationListRow {
    id: string;
    slug: string;
    name: string;
    status: string;
}

interface ActionRow {
    id: string;
    type: string;
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

function getAutomationsDatabaseOrThrow(): DatabaseSync {
    const database = temporaryFakeAutomationsDatabase.getTemporaryFakeAutomationsDatabase();
    if (!database) {
        throw new errors.InternalServerError({
            message: tpl(messages.automationsDatabaseUnavailable)
        });
    }
    return database;
}

function loadAutomationList(database: DatabaseSync): AutomationListRow[] {
    return database.prepare(`
        SELECT id, slug, name, status
        FROM automations
        ORDER BY created_at, id
    `).all() as unknown as AutomationListRow[];
}

function loadAutomationOrThrow(database: DatabaseSync, automationId: string): AutomationRow {
    const automation = database.prepare(`
        SELECT id, slug, name, status, created_at, updated_at
        FROM automations
        WHERE id = ?
    `).get(automationId) as AutomationRow | undefined;

    if (!automation) {
        throw new errors.NotFoundError({
            message: tpl(messages.automationNotFound)
        });
    }
    return automation;
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
        WHERE a.automation_id = ?
        ORDER BY e.source_action_id, e.target_action_id
    `).all(automationId) as unknown as EdgeRow[];
}

function buildActionPayload(row: ActionRow) {
    if (row.type === 'wait') {
        return {
            id: row.id,
            type: row.type,
            data: {
                wait_hours: row.wait_hours
            }
        };
    }
    return {
        id: row.id,
        type: row.type,
        data: {
            email_subject: row.email_subject,
            email_lexical: row.email_lexical,
            email_sender_name: row.email_sender_name,
            email_sender_email: row.email_sender_email,
            email_sender_reply_to: row.email_sender_reply_to,
            email_design_setting_id: row.email_design_setting_id
        }
    };
}

function buildEdgePayload(edge: EdgeRow) {
    return {
        source_action_id: edge.source_action_id,
        target_action_id: edge.target_action_id
    };
}

function browse() {
    const database = getAutomationsDatabaseOrThrow();
    return loadAutomationList(database).map(row => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status
    }));
}

function read(automationId: string) {
    const database = getAutomationsDatabaseOrThrow();
    const automation = loadAutomationOrThrow(database, automationId);
    const actions = loadActionRows(database, automationId).map(buildActionPayload);
    const edges = loadEdgeRows(database, automationId).map(buildEdgePayload);

    return {
        id: automation.id,
        slug: automation.slug,
        name: automation.name,
        status: automation.status,
        created_at: new Date(automation.created_at * 1000).toISOString(),
        updated_at: new Date(automation.updated_at * 1000).toISOString(),
        actions,
        edges
    };
}

function requestPoll() {
    domainEvents.dispatch(StartAutomationsPollEvent.create());
}

module.exports = {
    browse,
    read,
    requestPoll
};
