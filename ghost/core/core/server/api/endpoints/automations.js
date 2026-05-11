const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const domainEvents = require('@tryghost/domain-events');
const StartAutomationsPollEvent = require('../../services/automations/events/start-automations-poll-event');
const temporaryFakeAutomationsDatabase = require('../../services/automations/temporary-fake-database');

const messages = {
    automationNotFound: 'Automation not found.',
    automationsDatabaseUnavailable: 'Automations database is unavailable in this environment.'
};

/**
 * @typedef {object} AutomationRow
 * @prop {string} id
 * @prop {string} slug
 * @prop {string} name
 * @prop {string} status
 * @prop {number} created_at
 * @prop {number} updated_at
 */

/**
 * @typedef {object} AutomationListRow
 * @prop {string} id
 * @prop {string} slug
 * @prop {string} name
 * @prop {string} status
 */

/**
 * @typedef {object} ActionRow
 * @prop {string} id
 * @prop {string} type
 * @prop {number | null} wait_hours
 * @prop {string | null} email_subject
 * @prop {string | null} email_lexical
 * @prop {string | null} email_sender_name
 * @prop {string | null} email_sender_email
 * @prop {string | null} email_sender_reply_to
 * @prop {string | null} email_design_setting_id
 */

/**
 * @typedef {object} EdgeRow
 * @prop {string} source_action_id
 * @prop {string} target_action_id
 */

function getAutomationsDatabaseOrThrow() {
    const database = temporaryFakeAutomationsDatabase.getTemporaryFakeAutomationsDatabase();
    if (!database) {
        throw new errors.InternalServerError({
            message: tpl(messages.automationsDatabaseUnavailable)
        });
    }
    return database;
}

/**
 * @param {import('node:sqlite').DatabaseSync} database
 * @returns {AutomationListRow[]}
 */
function loadAutomationList(database) {
    return /** @type {AutomationListRow[]} */ (
        database.prepare(`
            SELECT id, slug, name, status
            FROM automations
            ORDER BY created_at, id
        `).all()
    );
}

/**
 * @param {import('node:sqlite').DatabaseSync} database
 * @param {string} automationId
 * @returns {AutomationRow}
 */
function loadAutomationOrThrow(database, automationId) {
    const automation = /** @type {AutomationRow | undefined} */ (
        database.prepare(`
            SELECT id, slug, name, status, created_at, updated_at
            FROM automations
            WHERE id = ?
        `).get(automationId)
    );
    if (!automation) {
        throw new errors.NotFoundError({
            message: tpl(messages.automationNotFound)
        });
    }
    return automation;
}

/**
 * @param {import('node:sqlite').DatabaseSync} database
 * @param {string} automationId
 * @returns {ActionRow[]}
 */
function loadActionRows(database, automationId) {
    return /** @type {ActionRow[]} */ (
        database.prepare(`
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
        `).all(automationId)
    );
}

/**
 * @param {import('node:sqlite').DatabaseSync} database
 * @param {string} automationId
 * @returns {EdgeRow[]}
 */
function loadEdgeRows(database, automationId) {
    return /** @type {EdgeRow[]} */ (
        database.prepare(`
            SELECT e.source_action_id, e.target_action_id
            FROM automation_action_edges e
            INNER JOIN automation_actions a ON a.id = e.source_action_id
            WHERE a.automation_id = ?
            ORDER BY e.source_action_id, e.target_action_id
        `).all(automationId)
    );
}

/**
 * @param {ActionRow} row
 */
function buildActionPayload(row) {
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

/**
 * @param {EdgeRow} edge
 */
function buildEdgePayload(edge) {
    return {
        source_action_id: edge.source_action_id,
        target_action_id: edge.target_action_id
    };
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'automations',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query() {
            const database = getAutomationsDatabaseOrThrow();
            return {
                data: loadAutomationList(database).map(row => ({
                    id: row.id,
                    name: row.name,
                    slug: row.slug,
                    status: row.status
                }))
            };
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'id'
        ],
        permissions: true,
        query(frame) {
            const database = getAutomationsDatabaseOrThrow();
            const automationId = frame.data.id;
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
    },

    poll: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'automations',
            method: 'poll'
        },
        query() {
            domainEvents.dispatch(StartAutomationsPollEvent.create());
        }
    }
};

module.exports = controller;
