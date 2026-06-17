const ObjectId = require('bson-objectid').default;
const moment = require('moment');
const db = require('../../core/server/data/db');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../../core/server/services/member-welcome-emails/constants');

const TEST_EMAIL_DESIGN_SETTING_ID = '64b6f7b7c8f1a2b3c4d5e6f7';

const TEST_AUTOMATION_SLUGS = [
    MEMBER_WELCOME_EMAIL_SLUGS.free,
    MEMBER_WELCOME_EMAIL_SLUGS.paid
];

const NON_EMPTY_EMAIL_LEXICAL = JSON.stringify({
    root: {children: [{type: 'paragraph', children: [{type: 'text', text: 'Lorem ipsum.'}]}], direction: null, format: '', indent: 0, type: 'root', version: 1}
});

const timestamp = offset => moment(new Date(Date.UTC(2026, 0, 1, 0, 0, offset))).format('YYYY-MM-DD HH:mm:ss');

async function setupAutomationsFixture() {
    await cleanupAutomationsFixture();
    await upsertEmailDesignSetting();

    const freeAutomationId = ObjectId().toHexString();
    const paidAutomationId = ObjectId().toHexString();
    const automationRows = [{
        id: freeAutomationId,
        created_at: timestamp(0),
        updated_at: timestamp(0),
        slug: MEMBER_WELCOME_EMAIL_SLUGS.free,
        name: 'Welcome Email (Free)',
        status: 'active'
    }, {
        id: paidAutomationId,
        created_at: timestamp(1),
        updated_at: timestamp(1),
        slug: MEMBER_WELCOME_EMAIL_SLUGS.paid,
        name: 'Welcome Email (Paid)',
        status: 'active'
    }];

    const freeActions = buildAutomationActions(freeAutomationId, 10);
    const paidActions = buildAutomationActions(paidAutomationId, 20);
    const actionRows = [...freeActions, ...paidActions].map(({id, automation_id, type, created_at}) => ({
        id,
        created_at,
        updated_at: created_at,
        automation_id,
        type
    }));

    await db.knex('automations').insert(automationRows);
    await db.knex('automation_actions').insert(actionRows);
    await db.knex('automation_action_revisions').insert([
        ...buildAutomationActionRevisions(freeActions, ['Welcome!', 'Follow up']),
        ...buildAutomationActionRevisions(paidActions, ['Welcome to Paid!', 'Exclusive Insights'])
    ]);
    await db.knex('automation_action_edges').insert([
        ...buildLinearEdges(freeActions),
        ...buildLinearEdges(paidActions)
    ]);
}

async function cleanupAutomationsFixture() {
    const automationIds = await db.knex('automations')
        .whereIn('slug', TEST_AUTOMATION_SLUGS)
        .pluck('id');

    if (automationIds.length === 0) {
        await db.knex('email_design_settings')
            .where('id', TEST_EMAIL_DESIGN_SETTING_ID)
            .del();
        return;
    }

    const actionIds = await db.knex('automation_actions')
        .whereIn('automation_id', automationIds)
        .pluck('id');
    const runIds = await db.knex('automation_runs')
        .whereIn('automation_id', automationIds)
        .pluck('id');

    if (runIds.length > 0) {
        await db.knex('automation_run_steps')
            .whereIn('automation_run_id', runIds)
            .del();
        await db.knex('automation_runs')
            .whereIn('id', runIds)
            .del();
    }

    if (actionIds.length > 0) {
        const revisionIds = await db.knex('automation_action_revisions')
            .whereIn('action_id', actionIds)
            .pluck('id');

        if (revisionIds.length > 0) {
            await db.knex('automated_email_recipients')
                .whereIn('automation_action_revision_id', revisionIds)
                .del();
        }

        await db.knex('automation_action_edges')
            .whereIn('source_action_id', actionIds)
            .orWhereIn('target_action_id', actionIds)
            .del();
        await db.knex('automation_action_revisions')
            .whereIn('action_id', actionIds)
            .del();
        await db.knex('automation_actions')
            .whereIn('id', actionIds)
            .del();
    }

    await db.knex('automations')
        .whereIn('id', automationIds)
        .del();
    await db.knex('email_design_settings')
        .where('id', TEST_EMAIL_DESIGN_SETTING_ID)
        .del();
}

function buildAutomationActions(automationId, startOffset) {
    return [{
        id: ObjectId().toHexString(),
        automation_id: automationId,
        type: 'wait',
        created_at: timestamp(startOffset)
    }, {
        id: ObjectId().toHexString(),
        automation_id: automationId,
        type: 'send_email',
        created_at: timestamp(startOffset + 1)
    }, {
        id: ObjectId().toHexString(),
        automation_id: automationId,
        type: 'wait',
        created_at: timestamp(startOffset + 2)
    }, {
        id: ObjectId().toHexString(),
        automation_id: automationId,
        type: 'send_email',
        created_at: timestamp(startOffset + 3)
    }];
}

function buildAutomationActionRevisions(actions, emailSubjects) {
    return [{
        id: ObjectId().toHexString(),
        created_at: actions[0].created_at,
        action_id: actions[0].id,
        wait_hours: 48,
        email_subject: null,
        email_lexical: null,
        email_design_setting_id: null
    }, {
        id: ObjectId().toHexString(),
        created_at: actions[1].created_at,
        action_id: actions[1].id,
        wait_hours: null,
        email_subject: emailSubjects[0],
        email_lexical: NON_EMPTY_EMAIL_LEXICAL,
        email_design_setting_id: TEST_EMAIL_DESIGN_SETTING_ID
    }, {
        id: ObjectId().toHexString(),
        created_at: actions[2].created_at,
        action_id: actions[2].id,
        wait_hours: 72,
        email_subject: null,
        email_lexical: null,
        email_design_setting_id: null
    }, {
        id: ObjectId().toHexString(),
        created_at: actions[3].created_at,
        action_id: actions[3].id,
        wait_hours: null,
        email_subject: emailSubjects[1],
        email_lexical: NON_EMPTY_EMAIL_LEXICAL,
        email_design_setting_id: TEST_EMAIL_DESIGN_SETTING_ID
    }];
}

function buildLinearEdges(actions) {
    return actions.slice(1).map((action, index) => ({
        source_action_id: actions[index].id,
        target_action_id: action.id
    }));
}

async function upsertEmailDesignSetting() {
    const currentTime = new Date();

    await db.knex('email_design_settings')
        .insert({
            id: TEST_EMAIL_DESIGN_SETTING_ID,
            slug: `automation-test-email-design-${TEST_EMAIL_DESIGN_SETTING_ID}`,
            background_color: 'light',
            header_background_color: 'transparent',
            show_header_icon: true,
            show_header_title: true,
            button_color: 'accent',
            button_corners: 'rounded',
            button_style: 'fill',
            link_color: 'accent',
            link_style: 'underline',
            body_font_category: 'sans_serif',
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            image_corners: 'square',
            show_badge: true,
            sender_name: null,
            sender_email: null,
            sender_reply_to: null,
            created_at: currentTime,
            updated_at: currentTime
        })
        .onConflict('id')
        .merge({
            sender_name: null,
            sender_email: null,
            sender_reply_to: null,
            updated_at: currentTime
        });
}

module.exports = {
    cleanupAutomationsFixture,
    setupAutomationsFixture,
    TEST_EMAIL_DESIGN_SETTING_ID
};
