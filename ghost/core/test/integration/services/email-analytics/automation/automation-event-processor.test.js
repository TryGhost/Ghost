const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const ObjectId = require('bson-objectid').default;

const testUtils = require('../../../../utils');
const AutomationEventProcessor = require('../../../../../core/server/services/email-analytics/automation/automation-event-processor');

describe('AutomationEventProcessor integration', function () {
    beforeAll(async function () {
        await testUtils.setup('default')();
    });

    beforeEach(async function () {
        await cleanupTables();
    });

    afterEach(async function () {
        await cleanupTables();
    });

    it('updates recipient state and aggregate counters for an event batch', async function () {
        const currentTime = new Date('2026-07-03T16:00:00.000Z');
        const openedAt = new Date('2026-07-03T16:30:00.000Z');
        const deliveredAt = new Date('2026-07-03T16:20:00.000Z');
        const member = await createMember({
            email_count: 7,
            email_opened_count: 3,
            email_open_rate: 43,
            automation_email_count: 5,
            automation_email_opened_count: 1,
            automation_email_open_rate: 20
        });
        const automation = await insert('automations', {
            id: ObjectId().toHexString(),
            status: 'active',
            name: 'Automation analytics integration',
            slug: `automation-analytics-integration-${ObjectId().toHexString()}`,
            created_at: currentTime,
            updated_at: currentTime
        });
        const action = await insert('automation_actions', {
            id: ObjectId().toHexString(),
            automation_id: automation.id,
            type: 'send_email',
            created_at: currentTime,
            updated_at: currentTime
        });
        const revision = await insert('automation_action_revisions', {
            id: ObjectId().toHexString(),
            action_id: action.id,
            created_at: currentTime,
            wait_hours: null,
            email_subject: 'Hello from automation',
            email_lexical: null,
            email_design_setting_id: null,
            sent_count: 5,
            delivered_count: 0,
            opened_count: 0
        });
        const recipient = await insert('automated_email_recipients', {
            id: ObjectId().toHexString(),
            automation_action_revision_id: revision.id,
            member_id: member.id,
            member_uuid: member.uuid,
            member_email: member.email,
            member_name: member.name,
            mailgun_message_id: '<automation-message@mailgun.example>',
            delivered_at: null,
            opened_at: null,
            created_at: currentTime,
            updated_at: currentTime
        });
        const eventProviderId = 'automation-message@mailgun.example';
        const processor = new AutomationEventProcessor({
            db: {
                knex: testUtils.knex
            }
        });

        const firstResult = await processor.processEvents([{
            id: 'opened-event-id',
            type: 'opened',
            providerId: eventProviderId,
            recipientEmail: member.email,
            timestamp: openedAt
        }, {
            id: 'delivered-event-id',
            type: 'delivered',
            providerId: eventProviderId,
            recipientEmail: member.email,
            timestamp: deliveredAt
        }]);

        const secondResult = await processor.processEvents([{
            id: 'opened-event-id',
            type: 'opened',
            providerId: eventProviderId,
            recipientEmail: member.email,
            timestamp: openedAt
        }, {
            id: 'delivered-event-id',
            type: 'delivered',
            providerId: eventProviderId,
            recipientEmail: member.email,
            timestamp: deliveredAt
        }]);

        assert.deepEqual(firstResult, {
            delivered: 1,
            opened: 1
        });
        assert.deepEqual(secondResult, {
            delivered: 0,
            opened: 0
        });

        const savedRecipient = await testUtils.knex('automated_email_recipients')
            .where({id: recipient.id})
            .first();
        const savedRevision = await testUtils.knex('automation_action_revisions')
            .where({id: revision.id})
            .first();
        const savedMember = await testUtils.knex('members')
            .where({id: member.id})
            .first();

        assert.equal(new Date(savedRecipient.opened_at).toISOString(), openedAt.toISOString());
        assert.equal(new Date(savedRecipient.delivered_at).toISOString(), deliveredAt.toISOString());
        assert.equal(savedRevision.opened_count, 1);
        assert.equal(savedRevision.delivered_count, 1);
        assert.equal(savedMember.automation_email_count, 5);
        assert.equal(savedMember.automation_email_opened_count, 2);
        assert.equal(savedMember.automation_email_open_rate, 40);
        assert.equal(savedMember.email_count, 7);
        assert.equal(savedMember.email_opened_count, 3);
        assert.equal(savedMember.email_open_rate, 43);
    });
});

async function cleanupTables() {
    await testUtils.knex('automated_email_recipients').del();
    await testUtils.knex('automation_action_revisions').del();
    await testUtils.knex('automation_actions').del();
    await testUtils.knex('automations').del();
    await testUtils.knex('members').del();
}

async function insert(table, attrs) {
    await testUtils.knex(table).insert(attrs);
    return attrs;
}

async function createMember(attrs = {}) {
    const currentTime = new Date('2026-07-03T16:00:00.000Z');
    return insert('members', {
        id: ObjectId().toHexString(),
        uuid: crypto.randomUUID(),
        transient_id: crypto.randomUUID(),
        email: `member-${ObjectId().toHexString()}@example.com`,
        status: 'free',
        name: 'Test Member',
        enable_comment_notifications: true,
        email_count: 0,
        email_opened_count: 0,
        email_open_rate: null,
        automation_email_count: 0,
        automation_email_opened_count: 0,
        automation_email_open_rate: null,
        email_disabled: false,
        created_at: currentTime,
        updated_at: currentTime,
        ...attrs
    });
}
