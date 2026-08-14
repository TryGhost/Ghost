// @ts-check
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {default: ObjectId} = require('bson-objectid');
const sinon = require('sinon');
const {agentProvider} = require('../../../utils/e2e-framework');
const testUtils = require('../../../utils');
const MailgunClient = require('../../../../core/server/services/lib/mailgun-client');
const {AUTOMATION_EMAIL_TAG, DEFAULT_EMAIL_DESIGN_SETTING_SLUG} = require('../../../../core/server/services/member-welcome-emails/constants');
const queries = require('../../../../core/server/services/email-analytics/lib/queries');
const emailAnalytics = require('../../../../core/server/services/email-analytics');
const automationsApi = require('../../../../core/server/services/automations/automations-api');

// Every event we hand back to the pipeline is dated here. The fetch window
// starts at the stubbed cursor (see getLastEventTimestamp below) and ends a few
// minutes before now, so any fixed past date inside that window works.
const EVENT_DATE = new Date('2024-01-01T00:00:00.000Z');

function clearInMemoryCursors() {
    for (const fetchData of Object.values(emailAnalytics.automations.service.getStatus())) {
        delete fetchData.lastEventTimestamp;
        delete fetchData.lastBegin;
    }
}

describe('Automation email analytics', function () {
    let mailgunEvents = [];
    let emailDesignSettingId;

    beforeAll(async function () {
        sinon.stub(queries, 'getLastEventTimestamp').resolves(new Date(2000, 0, 1));
        // Same reason, for the cursor fetchMissing starts from.
        sinon.stub(queries, 'getLastJobRunTimestamp').resolves(new Date(2000, 0, 1));

        await agentProvider.getAdminAPIAgent();

        const emailDesignSetting = await testUtils.knex('email_design_settings')
            .where('slug', DEFAULT_EMAIL_DESIGN_SETTING_SLUG)
            .first('id');
        assert.ok(emailDesignSetting, `expected the ${DEFAULT_EMAIL_DESIGN_SETTING_SLUG} design setting to exist`);
        emailDesignSettingId = emailDesignSetting.id;

        sinon.stub(MailgunClient.prototype, 'fetchEvents').callsFake(async function (mailgunOptions, batchHandler) {
            const wantedTags = mailgunOptions.tags ? mailgunOptions.tags.split(' AND ') : [];
            const wantedEventTypes = mailgunOptions.event.split(' OR ');
            const matching = mailgunEvents.filter((event) => {
                const tags = event.tags ?? [];
                return wantedTags.every(tag => tags.includes(tag)) &&
                    wantedEventTypes.includes(event.event) &&
                    (mailgunOptions.begin === undefined || event.timestamp >= mailgunOptions.begin) &&
                    (mailgunOptions.end === undefined || event.timestamp <= mailgunOptions.end);
            });
            const normalized = matching.map(this.normalizeEvent).filter(event => !!event);
            return normalized.length ? [await batchHandler(normalized)] : [];
        });
    });

    afterAll(function () {
        sinon.restore();
    });


    beforeEach(async function () {
        mailgunEvents = [];
        clearInMemoryCursors();
        await cleanupTables();
    });

    afterEach(async function () {
        await cleanupTables();
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
        const now = new Date();
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
            email_disabled: false,
            created_at: now,
            updated_at: now,
            ...attrs
        });
    }

    async function createSendEmailRevision() {
        const now = new Date();
        const uniqueSuffix = ObjectId().toHexString();

        const automation = await insert('automations', {
            id: ObjectId().toHexString(),
            status: 'active',
            name: `Automation ${uniqueSuffix}`,
            slug: `automation-${uniqueSuffix}`,
            created_at: now,
            updated_at: now
        });
        const action = await insert('automation_actions', {
            id: ObjectId().toHexString(),
            automation_id: automation.id,
            type: 'send_email',
            created_at: now,
            updated_at: now
        });
        return insert('automation_action_revisions', {
            id: ObjectId().toHexString(),
            action_id: action.id,
            created_at: now,
            email_subject: 'Welcome!',
            email_lexical: '{"root":{"children":[]}}',
            email_design_setting_id: emailDesignSettingId,
            email_sent_count: 0,
            email_opened_count: 0
        });
    }

    async function recordEmailSent({revision, mailgunMessageId, trackClicks = true, trackOpens = true}) {
        const member = await createMember();
        await automationsApi.recordEmailSent({
            automationActionRevisionId: revision.id,
            mailgunMessageId,
            memberEmail: member.email,
            memberId: member.id,
            memberName: member.name,
            memberUuid: member.uuid,
            trackClicks,
            trackOpens
        });
        return await testUtils.knex('automated_email_recipients')
            .where('mailgun_message_id', mailgunMessageId)
            .first();
    }

    function mailgunEvent({type, messageId, recipientEmail, timestamp = EVENT_DATE, tags = [AUTOMATION_EMAIL_TAG]}) {
        return {
            id: ObjectId().toHexString(),
            event: type,
            recipient: recipientEmail,
            tags,
            message: {
                headers: {
                    'message-id': `<${messageId}>`
                }
            },
            timestamp: timestamp.getTime() / 1000
        };
    }

    async function readRecipient(id) {
        return await testUtils.knex('automated_email_recipients').where({id}).first();
    }

    async function readRevision(id) {
        return await testUtils.knex('automation_action_revisions').where({id}).first();
    }

    function assertDateEqual(actual, expected, message) {
        assert.ok(actual, `${message}: expected a date, got ${actual}`);
        assert.equal(new Date(actual).toUTCString(), expected.toUTCString(), message);
    }

    it('records delivered events against the automated email recipient', async function () {
        const revision = await createSendEmailRevision();
        const messageId = 'delivered-message-id@mg.example.com';
        const recipient = await recordEmailSent({revision, mailgunMessageId: messageId});

        assert.equal(recipient.delivered_at, null);

        mailgunEvents = [mailgunEvent({
            type: 'delivered',
            messageId,
            recipientEmail: recipient.member_email
        })];

        const eventCount = await emailAnalytics.automations.fetchLatestNonOpenedEvents();
        assert.equal(eventCount, 1);

        const updated = await readRecipient(recipient.id);
        assertDateEqual(updated.delivered_at, EVENT_DATE, 'delivered_at should match the Mailgun event timestamp');
        assert.equal(updated.opened_at, null, 'a delivered event should not set opened_at');
    });

    it('records opened events and counts the open against the revision', async function () {
        const revision = await createSendEmailRevision();
        const messageId = 'opened-message-id@mg.example.com';
        const recipient = await recordEmailSent({revision, mailgunMessageId: messageId});

        mailgunEvents = [mailgunEvent({
            type: 'opened',
            messageId,
            recipientEmail: recipient.member_email
        })];

        const eventCount = await emailAnalytics.automations.fetchLatestOpenedEvents();
        assert.equal(eventCount, 1);

        const updated = await readRecipient(recipient.id);
        assertDateEqual(updated.opened_at, EVENT_DATE, 'opened_at should match the Mailgun event timestamp');

        const updatedRevision = await readRevision(revision.id);
        assert.equal(updatedRevision.email_opened_count, 1);
    });

    it('keeps the earliest timestamp when a message has several events', async function () {
        const revision = await createSendEmailRevision();
        const messageId = 'repeated-message-id@mg.example.com';
        const recipient = await recordEmailSent({revision, mailgunMessageId: messageId});

        const laterDate = new Date(EVENT_DATE.getTime() + 60 * 60 * 1000);

        // Deliberately out of order: the later open is listed first.
        mailgunEvents = [
            mailgunEvent({type: 'opened', messageId, recipientEmail: recipient.member_email, timestamp: laterDate}),
            mailgunEvent({type: 'opened', messageId, recipientEmail: recipient.member_email, timestamp: EVENT_DATE})
        ];

        const eventCount = await emailAnalytics.automations.fetchLatestOpenedEvents();
        assert.equal(eventCount, 2);

        const updated = await readRecipient(recipient.id);
        assertDateEqual(updated.opened_at, EVENT_DATE, 'opened_at should be the earliest open');

        const updatedRevision = await readRevision(revision.id);
        assert.equal(updatedRevision.email_opened_count, 1, 'a recipient that opens twice is still one opener');
    });

    it('counts every recipient of a revision that opens', async function () {
        const revision = await createSendEmailRevision();
        const first = await recordEmailSent({revision, mailgunMessageId: 'opener-one@mg.example.com'});
        const second = await recordEmailSent({revision, mailgunMessageId: 'opener-two@mg.example.com'});

        mailgunEvents = [
            mailgunEvent({type: 'opened', messageId: 'opener-one@mg.example.com', recipientEmail: first.member_email}),
            mailgunEvent({type: 'opened', messageId: 'opener-two@mg.example.com', recipientEmail: second.member_email})
        ];

        await emailAnalytics.automations.fetchLatestOpenedEvents();

        const updatedRevision = await readRevision(revision.id);
        assert.equal(updatedRevision.email_opened_count, 2);
    });

    it('does not count an open again when a later job refetches it', async function () {
        const revision = await createSendEmailRevision();
        const messageId = 'refetched-message-id@mg.example.com';
        const recipient = await recordEmailSent({revision, mailgunMessageId: messageId});

        mailgunEvents = [mailgunEvent({
            type: 'opened',
            messageId,
            recipientEmail: recipient.member_email
        })];

        await emailAnalytics.automations.fetchLatestOpenedEvents();
        assert.equal((await readRevision(revision.id)).email_opened_count, 1);

        // fetchMissing keeps its own cursor and sweeps a window overlapping the
        // one the opened job already covered, so it sees this open a second time.
        const refetchedCount = await emailAnalytics.automations.fetchMissing();
        assert.equal(refetchedCount, 1, 'the missing-events job should see the same open again');

        assert.equal((await readRevision(revision.id)).email_opened_count, 1, 'the open should only count once');
        assertDateEqual((await readRecipient(recipient.id)).opened_at, EVENT_DATE, 'opened_at should be unchanged');
    });

    it('routes events to the right recipient and ignores unknown message ids', async function () {
        const revision = await createSendEmailRevision();
        const otherRevision = await createSendEmailRevision();
        const first = await recordEmailSent({revision, mailgunMessageId: 'first@mg.example.com'});
        const second = await recordEmailSent({revision: otherRevision, mailgunMessageId: 'second@mg.example.com'});

        mailgunEvents = [
            mailgunEvent({type: 'delivered', messageId: 'first@mg.example.com', recipientEmail: first.member_email}),
            mailgunEvent({type: 'delivered', messageId: 'unknown@mg.example.com', recipientEmail: 'nobody@example.com'})
        ];

        const eventCount = await emailAnalytics.automations.fetchLatestNonOpenedEvents();
        assert.equal(eventCount, 2, 'the unprocessable event is still counted as fetched');

        const updatedFirst = await readRecipient(first.id);
        assertDateEqual(updatedFirst.delivered_at, EVENT_DATE, 'the matching recipient should be marked delivered');

        const updatedSecond = await readRecipient(second.id);
        assert.equal(updatedSecond.delivered_at, null, 'an unrelated recipient should be untouched');
    });

    it('ignores events that are not tagged as automation emails', async function () {
        const revision = await createSendEmailRevision();
        const messageId = 'newsletter-message-id@mg.example.com';
        const recipient = await recordEmailSent({revision, mailgunMessageId: messageId});

        mailgunEvents = [mailgunEvent({
            type: 'delivered',
            messageId,
            recipientEmail: recipient.member_email,
            tags: ['bulk-email']
        })];

        const eventCount = await emailAnalytics.automations.fetchLatestNonOpenedEvents();
        assert.equal(eventCount, 0);

        const updated = await readRecipient(recipient.id);
        assert.equal(updated.delivered_at, null);
    });
});
