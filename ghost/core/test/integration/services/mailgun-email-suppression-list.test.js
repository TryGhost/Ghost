const sinon = require('sinon');
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const assert = require('assert/strict');
const MailgunClient = require('@tryghost/mailgun-client');
const DomainEvents = require('@tryghost/domain-events');
const emailAnalytics = require('../../../core/server/services/email-analytics');

describe('MailgunEmailSuppressionList', function () {
    let agent;
    let events = [];

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');
        await agent.loginAsOwner();

        sinon.stub(MailgunClient.prototype, 'fetchEvents').callsFake(async function (_, batchHandler) {
            const normalizedEvents = (events.map(this.normalizeEvent) || []).filter(e => !!e);
            return [await batchHandler(normalizedEvents)];
        });
    });

    after(function () {
        sinon.restore();
    });

    it('Can handle permanent failure events with an error code of 605', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);

        const emailRecipient = fixtureManager.get('email_recipients', 0);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);
        const recipient = emailRecipient.member_email;

        const {body: {members: [member]}} = await agent.get(`/members/${memberId}`);
        assert.equal(member.email_suppression.suppressed, false, 'This test requires a member that does not have a suppressed email');

        events = [createPermanentFailedEvent({
            errorCode: 605,
            providerId,
            timestamp,
            recipient
        })];

        await emailAnalytics.fetchLatestOpenedEvents();
        await DomainEvents.allSettled();

        const {body: {members: [memberAfter]}} = await agent.get(`/members/${memberId}`);
        assert.equal(memberAfter.email_suppression.suppressed, true, 'The member should have a suppressed email');
        assert.equal(memberAfter.email_suppression.info.reason, 'fail');
    });

    it('Can handle permanent failure events with an error code of 607', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);

        const emailRecipient = fixtureManager.get('email_recipients', 1);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);
        const recipient = emailRecipient.member_email;

        const {body: {members: [member]}} = await agent.get(`/members/${memberId}`);
        assert.equal(member.email_suppression.suppressed, false, 'This test requires a member that does not have a suppressed email');

        events = [createPermanentFailedEvent({
            errorCode: 607,
            providerId,
            timestamp,
            recipient
        })];

        await emailAnalytics.fetchLatestOpenedEvents();
        await DomainEvents.allSettled();

        const {body: {members: [memberAfter]}} = await agent.get(`/members/${memberId}`);
        assert.equal(memberAfter.email_suppression.suppressed, true, 'The member should have a suppressed email');
        assert.equal(memberAfter.email_suppression.info.reason, 'fail');
    });

    it('Can handle permanent failure events with an error code of 4xx', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);

        const emailRecipient = fixtureManager.get('email_recipients', 2);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);
        const recipient = emailRecipient.member_email;

        const {body: {members: [member]}} = await agent.get(`/members/${memberId}`);
        assert.equal(member.email_suppression.suppressed, false, 'This test requires a member that does not have a suppressed email');

        events = [createPermanentFailedEvent({
            errorCode: 400 + Math.floor(Math.random() * 100), // Random number between 400-499
            providerId,
            timestamp,
            recipient
        })];

        await emailAnalytics.fetchLatestOpenedEvents();
        await DomainEvents.allSettled();

        const {body: {members: [memberAfter]}} = await agent.get(`/members/${memberId}`);
        assert.equal(memberAfter.email_suppression.suppressed, false, 'The member should not have a suppressed email');
        assert.equal(memberAfter.email_suppression.info, null);
    });

    it('Can handle permanent failure events with an error code of 5xx', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);

        const emailRecipient = fixtureManager.get('email_recipients', 3);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);
        const recipient = emailRecipient.member_email;

        const {body: {members: [member]}} = await agent.get(`/members/${memberId}`);
        assert.equal(member.email_suppression.suppressed, false, 'This test requires a member that does not have a suppressed email');

        events = [createPermanentFailedEvent({
            errorCode: 500 + Math.floor(Math.random() * 100), // Random number between 500-599
            providerId,
            timestamp,
            recipient
        })];

        await emailAnalytics.fetchLatestOpenedEvents();
        await DomainEvents.allSettled();

        const {body: {members: [memberAfter]}} = await agent.get(`/members/${memberId}`);
        assert.equal(memberAfter.email_suppression.suppressed, false, 'The member should not have a suppressed email');
        assert.equal(memberAfter.email_suppression.info, null);
    });

    it('Can handle complaint events', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);
        const emailId = emailBatch.email_id;

        const emailRecipient = fixtureManager.get('email_recipients', 4);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);

        const {body: {members: [member]}} = await agent.get(`/members/${memberId}`);
        assert.equal(member.email_suppression.suppressed, false, 'This test requires a member that does not have a suppressed email');

        events = [{
            event: 'complained',
            recipient: emailRecipient.member_email,
            'user-variables': {
                'email-id': emailId
            },
            message: {
                headers: {
                    'message-id': providerId
                }
            },
            timestamp: Math.round(timestamp.getTime() / 1000)
        }];

        await emailAnalytics.fetchLatestOpenedEvents();
        await DomainEvents.allSettled();

        const {body: {members: [memberAfter]}} = await agent.get(`/members/${memberId}`);
        assert.equal(memberAfter.email_suppression.suppressed, true, 'The member should have a suppressed email');
        assert.equal(memberAfter.email_suppression.info.reason, 'spam');
    });
});

function createPermanentFailedEvent({errorCode, providerId, timestamp, recipient}) {
    return {
        event: 'failed',
        id: 'pl271FzxTTmGRW8Uj3dUWw',
        'log-level': 'error',
        severity: 'permanent',
        reason: 'suppress-bounce',
        envelope: {
            sender: 'john@example.org',
            transport: 'smtp',
            targets: 'joan@example.com'
        },
        flags: {
            'is-routed': false,
            'is-authenticated': true,
            'is-system-test': false,
            'is-test-mode': false
        },
        'delivery-status': {
            'attempt-no': 1,
            message: '',
            code: errorCode,
            description: 'Not delivering to previously bounced address',
            'session-seconds': 0.0
        },
        message: {
            headers: {
                to: 'joan@example.com',
                'message-id': providerId,
                from: 'john@example.org',
                subject: 'Test Subject'
            },
            attachments: [],
            size: 867
        },
        storage: {
            url: 'https://se.api.mailgun.net/v3/domains/example.org/messages/eyJwI...',
            key: 'eyJwI...'
        },
        recipient: recipient,
        'recipient-domain': 'mailgun.com',
        campaigns: [],
        tags: [],
        'user-variables': {},
        timestamp: Math.round(timestamp.getTime() / 1000)
    };
}
