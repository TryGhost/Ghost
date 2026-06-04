const ObjectId = require('bson-objectid').default;
const errors = require('@tryghost/errors');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');
const lexicalLib = require('../../lib/lexical');
const {DEFAULT_EMAIL_DESIGN_SETTING_SLUG} = require('./constants');

const REVISION_FIELDS = [
    'email_subject',
    'email_lexical',
    'email_sender_name',
    'email_sender_email',
    'email_sender_reply_to',
    'email_design_setting_id'
];

const DATA_TO_REVISION_FIELD = {
    subject: 'email_subject',
    lexical: 'email_lexical',
    sender_name: 'email_sender_name',
    sender_email: 'email_sender_email',
    sender_reply_to: 'email_sender_reply_to',
    email_design_setting_id: 'email_design_setting_id'
};

const REVISION_TO_DATA_FIELD = Object.fromEntries(
    Object.entries(DATA_TO_REVISION_FIELD).map(([dataField, revisionField]) => [revisionField, dataField])
);

function knex(options = {}) {
    return options.transacting || models.Base.knex;
}

function id() {
    return ObjectId().toHexString();
}

function serializeDate(value) {
    return value || new Date();
}

function serializeDateForApi(value) {
    if (!value) {
        return value;
    }

    const date = new Date(value);
    date.setMilliseconds(0);
    return date.toISOString();
}

function getNextRevisionCreatedAt(latestCreatedAt, requestedCreatedAt) {
    if (!latestCreatedAt) {
        return requestedCreatedAt;
    }

    const requested = new Date(requestedCreatedAt).getTime();
    const latest = new Date(latestCreatedAt).getTime();

    if (requested > latest) {
        return requestedCreatedAt;
    }

    return new Date(latest + 1);
}

function formatLexicalOnWrite(value) {
    if (!value) {
        return value;
    }

    return urlUtils.lexicalToTransformReady(value, {
        nodes: lexicalLib.nodes,
        transformMap: lexicalLib.urlTransformMap
    });
}

function parseLexicalOnRead(value) {
    if (!value) {
        return value;
    }

    return urlUtils.transformReadyToAbsolute(value);
}

async function getDefaultEmailDesignSettingId(options = {}) {
    const emailDesignSetting = await models.EmailDesignSetting.findOne({
        slug: DEFAULT_EMAIL_DESIGN_SETTING_SLUG
    }, options);

    if (!emailDesignSetting) {
        throw new errors.InternalServerError({
            message: 'Missing default email design setting for automated emails'
        });
    }

    return emailDesignSetting.get('id');
}

function rowToEmail(row) {
    if (!row) {
        return null;
    }

    return {
        action_id: row.action_id,
        automation_id: row.automation_id,
        subject: row.email_subject,
        lexical: parseLexicalOnRead(row.email_lexical),
        sender_name: row.email_sender_name,
        sender_email: row.email_sender_email,
        sender_reply_to: row.email_sender_reply_to,
        email_design_setting_id: row.email_design_setting_id,
        created_at: serializeDateForApi(row.action_created_at),
        updated_at: serializeDateForApi(row.action_updated_at)
    };
}

function legacyRowToEmail(row) {
    if (!row) {
        return null;
    }

    return {
        action_id: null,
        automation_id: row.welcome_email_automation_id,
        subject: row.subject,
        lexical: parseLexicalOnRead(row.lexical),
        sender_name: row.sender_name,
        sender_email: row.sender_email,
        sender_reply_to: row.sender_reply_to,
        email_design_setting_id: row.email_design_setting_id,
        created_at: serializeDateForApi(row.created_at),
        updated_at: serializeDateForApi(row.updated_at || row.created_at)
    };
}

function latestActionRowsQuery(automationIds, options = {}) {
    return knex(options)('automation_actions as a')
        .innerJoin('automation_action_revisions as r', 'r.action_id', 'a.id')
        .whereIn('a.automation_id', automationIds)
        .where('a.type', 'send_email')
        .whereNull('a.deleted_at')
        .whereRaw(`r.created_at = (
            SELECT MAX(latest.created_at)
            FROM automation_action_revisions latest
            WHERE latest.action_id = a.id
        )`)
        .select({
            action_id: 'a.id',
            automation_id: 'a.automation_id',
            action_created_at: 'a.created_at',
            action_updated_at: 'a.updated_at',
            revision_created_at: 'r.created_at',
            email_subject: 'r.email_subject',
            email_lexical: 'r.email_lexical',
            email_sender_name: 'r.email_sender_name',
            email_sender_email: 'r.email_sender_email',
            email_sender_reply_to: 'r.email_sender_reply_to',
            email_design_setting_id: 'r.email_design_setting_id'
        })
        .orderBy('a.created_at', 'asc')
        .orderBy('a.id', 'asc');
}

async function loadEmailMapForAutomations(automations, options = {}) {
    const automationIds = automations.map(automation => automation.id).filter(Boolean);
    const byAutomationId = new Map();

    if (automationIds.length === 0) {
        return byAutomationId;
    }

    const rows = await latestActionRowsQuery(automationIds, options);

    // Welcome email automations currently expose one send_email action through
    // the legacy /automated_emails/ API. If a future generic automation has
    // multiple send_email actions, this facade keeps using the first action.
    for (const row of rows) {
        if (!byAutomationId.has(row.automation_id)) {
            byAutomationId.set(row.automation_id, rowToEmail(row));
        }
    }

    const missingAutomationIds = automationIds.filter(automationId => !byAutomationId.has(automationId));

    if (missingAutomationIds.length > 0) {
        const legacyRows = await knex(options)('welcome_email_automated_emails')
            .whereIn('welcome_email_automation_id', missingAutomationIds)
            .orderBy('created_at', 'asc')
            .orderBy('id', 'asc');

        // Read-only fallback for pre-migration data and older test fixtures.
        // Runtime writes are intentionally not mirrored back to this table.
        for (const row of legacyRows) {
            if (!byAutomationId.has(row.welcome_email_automation_id)) {
                byAutomationId.set(row.welcome_email_automation_id, legacyRowToEmail(row));
            }
        }
    }

    return byAutomationId;
}

async function loadEmailForAutomationId(automationId, options = {}) {
    const byAutomationId = await loadEmailMapForAutomations([{id: automationId}], options);
    return byAutomationId.get(automationId) || null;
}

async function buildRevisionData(data, options = {}) {
    const revisionData = {};

    for (const [dataField, revisionField] of Object.entries(DATA_TO_REVISION_FIELD)) {
        if (Object.prototype.hasOwnProperty.call(data, dataField)) {
            revisionData[revisionField] = dataField === 'lexical' ? formatLexicalOnWrite(data[dataField]) : data[dataField];
        }
    }

    if (!revisionData.email_design_setting_id) {
        revisionData.email_design_setting_id = await getDefaultEmailDesignSettingId(options);
    }

    return revisionData;
}

function mergeRevisionData(existingEmail, data) {
    const merged = {};

    for (const revisionField of REVISION_FIELDS) {
        const dataField = REVISION_TO_DATA_FIELD[revisionField];

        if (Object.prototype.hasOwnProperty.call(data, dataField)) {
            merged[revisionField] = dataField === 'lexical' ? formatLexicalOnWrite(data[dataField]) : data[dataField];
            continue;
        }

        merged[revisionField] = dataField === 'lexical' ? formatLexicalOnWrite(existingEmail[dataField]) : existingEmail[dataField];
    }

    return merged;
}

async function addEmailAction(automation, data, options = {}) {
    const actionId = id();
    const createdAt = serializeDate(automation.get('created_at'));
    const updatedAt = serializeDate(automation.get('updated_at') || automation.get('created_at'));
    const revisionData = await buildRevisionData(data, options);

    await knex(options)('automation_actions').insert({
        id: actionId,
        created_at: createdAt,
        updated_at: updatedAt,
        deleted_at: null,
        automation_id: automation.id,
        type: 'send_email'
    });

    await knex(options)('automation_action_revisions').insert({
        id: id(),
        created_at: updatedAt,
        action_id: actionId,
        wait_hours: null,
        ...revisionData
    });

    return loadEmailForAutomationId(automation.id, options);
}

async function editEmailAction(automationId, data, options = {}) {
    const currentEmail = await loadEmailForAutomationId(automationId, options);

    if (!currentEmail?.action_id) {
        return null;
    }

    const now = new Date();
    const latestRow = await latestActionRowsQuery([automationId], options)
        .where('a.id', currentEmail.action_id)
        .first();

    await knex(options)('automation_actions')
        .where({id: currentEmail.action_id})
        .update({
            updated_at: now
        });

    await knex(options)('automation_action_revisions').insert({
        id: id(),
        created_at: getNextRevisionCreatedAt(latestRow?.revision_created_at, now),
        action_id: currentEmail.action_id,
        wait_hours: null,
        ...mergeRevisionData(currentEmail, data)
    });

    return loadEmailForAutomationId(automationId, options);
}

async function loadEmailDesignSetting(email, options = {}) {
    if (!email?.email_design_setting_id) {
        return null;
    }

    return models.EmailDesignSetting.findOne({
        id: email.email_design_setting_id
    }, options);
}

module.exports = {
    addEmailAction,
    editEmailAction,
    loadEmailForAutomationId,
    loadEmailMapForAutomations,
    loadEmailDesignSetting
};
