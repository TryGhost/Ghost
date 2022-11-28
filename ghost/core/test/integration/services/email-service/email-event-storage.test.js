const sinon = require('sinon');
const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const assert = require('assert');
const models = require('../../../../core/server/models');
const domainEvents = require('@tryghost/domain-events');
const MailgunClient = require('@tryghost/mailgun-client');
const {run} = require('../../../../core/server/services/email-analytics/jobs/fetch-latest/run.js');
const membersService = require('../../../../core/server/services/members');

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// Test the whole E2E flow from Mailgun events -> handling and storage
describe('EmailEventStorage', function () {
    let _mailgunClient;
    let agent;
    let events = [];
    let jobsService;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');
        await agent.loginAsOwner();

        // Only create reference to jobsService after Ghost boot
        jobsService = require('../../../../core/server/services/jobs');

        sinon.stub(MailgunClient.prototype, 'fetchEvents').callsFake(async function (_, batchHandler) {
            const normalizedEvents = events.map(this.normalizeEvent) || [];
            return [await batchHandler(normalizedEvents)];
        });
    });

    it('Can handle delivered events', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);
        const emailId = emailBatch.email_id;

        const emailRecipient = fixtureManager.get('email_recipients', 0);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);

        events = [{
            event: 'delivered',
            recipient: emailRecipient.member_email,
            'user-variables': {
                'email-id': emailId
            },
            message: {
                headers: {
                    'message-id': providerId
                }
            },
            // unix timestamp
            timestamp: Math.round(timestamp.getTime() / 1000)
        }];

        const initialModel = await models.EmailRecipient.findOne({
            id: emailRecipient.id
        }, {require: true});

        assert.equal(initialModel.get('delivered_at'), null);

        // Fire event processing
        // We use offloading to have correct coverage and usage of worker thread
        const result = await run({
            domainEvents
        });
        assert.equal(result.delivered, 1);
        assert.deepEqual(result.emailIds, [emailId]);
        assert.deepEqual(result.memberIds, [memberId]);

        // Now wait for events processed
        await sleep(100);

        // Check if status has changed to delivered, with correct timestamp
        const updatedEmailRecipient = await models.EmailRecipient.findOne({
            id: emailRecipient.id
        }, {require: true});

        assert.equal(updatedEmailRecipient.get('delivered_at').toUTCString(), timestamp.toUTCString());
    });

    it('Can handle delivered events without user variables', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);
        const emailId = emailBatch.email_id;

        const emailRecipient = fixtureManager.get('email_recipients', 0);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);

        // Reset
        await models.EmailRecipient.edit({delivered_at: null}, {
            id: emailRecipient.id
        });

        events = [{
            event: 'delivered',
            recipient: emailRecipient.member_email,
            'user-variables': {},
            message: {
                headers: {
                    'message-id': providerId
                }
            },
            // unix timestamp
            timestamp: Math.round(timestamp.getTime() / 1000)
        }];

        const initialModel = await models.EmailRecipient.findOne({
            id: emailRecipient.id
        }, {require: true});

        assert.equal(initialModel.get('delivered_at'), null);

        // Fire event processing
        // We use offloading to have correct coverage and usage of worker thread
        const result = await run({
            domainEvents
        });
        assert.equal(result.delivered, 1);
        assert.deepEqual(result.emailIds, [emailId]);
        assert.deepEqual(result.memberIds, [memberId]);

        // Now wait for events processed
        await sleep(100);

        // Check if status has changed to delivered, with correct timestamp
        const updatedEmailRecipient = await models.EmailRecipient.findOne({
            id: emailRecipient.id
        }, {require: true});

        assert.equal(updatedEmailRecipient.get('delivered_at').toUTCString(), timestamp.toUTCString());
    });

    it('Can handle opened events', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);
        const emailId = emailBatch.email_id;

        const emailRecipient = fixtureManager.get('email_recipients', 0);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);

        events = [{
            event: 'opened',
            recipient: emailRecipient.member_email,
            'user-variables': {
                'email-id': emailId
            },
            message: {
                headers: {
                    'message-id': providerId
                }
            },
            // unix timestamp
            timestamp: Math.round(timestamp.getTime() / 1000)
        }];

        const initialModel = await models.EmailRecipient.findOne({
            id: emailRecipient.id
        }, {require: true});

        assert.equal(initialModel.get('opened_at'), null);

        // Fire event processing
        // We use offloading to have correct coverage and usage of worker thread
        const result = await run({
            domainEvents
        });
        assert.equal(result.opened, 1);
        assert.deepEqual(result.emailIds, [emailId]);
        assert.deepEqual(result.memberIds, [memberId]);

        // Now wait for events processed
        await sleep(100);

        // Check if status has changed to delivered, with correct timestamp
        const updatedEmailRecipient = await models.EmailRecipient.findOne({
            id: emailRecipient.id
        }, {require: true});

        assert.equal(updatedEmailRecipient.get('opened_at').toUTCString(), timestamp.toUTCString());

        // TODO: check last seen at
    });

    it('Can handle permanent failure events', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);
        const emailId = emailBatch.email_id;

        const emailRecipient = fixtureManager.get('email_recipients', 0);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);

        events = [{
            event: 'failed',
            severity: 'permanent',
            recipient: emailRecipient.member_email,
            'user-variables': {
                'email-id': emailId
            },
            message: {
                headers: {
                    'message-id': providerId
                }
            },
            // unix timestamp
            timestamp: Math.round(timestamp.getTime() / 1000)
        }];

        const initialModel = await models.EmailRecipient.findOne({
            id: emailRecipient.id
        }, {require: true});

        assert.equal(initialModel.get('failed_at'), null);

        // Fire event processing
        // We use offloading to have correct coverage and usage of worker thread
        const result = await run({
            domainEvents
        });
        assert.equal(result.permanentFailed, 1);
        assert.deepEqual(result.emailIds, [emailId]);
        assert.deepEqual(result.memberIds, [memberId]);

        // Now wait for events processed
        await sleep(200);

        // Check if status has changed to delivered, with correct timestamp
        const updatedEmailRecipient = await models.EmailRecipient.findOne({
            id: emailRecipient.id
        }, {require: true});

        assert.equal(updatedEmailRecipient.get('failed_at').toUTCString(), timestamp.toUTCString());
    });

    it('Can handle tempoary failure events', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);
        const emailId = emailBatch.email_id;

        const emailRecipient = fixtureManager.get('email_recipients', 0);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);

        // Reset
        await models.EmailRecipient.edit({failed_at: null}, {
            id: emailRecipient.id
        });

        events = [{
            event: 'failed',
            severity: 'temporary',
            recipient: emailRecipient.member_email,
            'user-variables': {
                'email-id': emailId
            },
            message: {
                headers: {
                    'message-id': providerId
                }
            },
            // unix timestamp
            timestamp: Math.round(timestamp.getTime() / 1000)
        }];

        const initialModel = await models.EmailRecipient.findOne({
            id: emailRecipient.id
        }, {require: true});

        assert.equal(initialModel.get('failed_at'), null);

        // Fire event processing
        // We use offloading to have correct coverage and usage of worker thread
        const result = await run({
            domainEvents
        });
        assert.equal(result.temporaryFailed, 1);
        assert.deepEqual(result.emailIds, [emailId]);
        assert.deepEqual(result.memberIds, [memberId]);

        // Now wait for events processed
        await sleep(200);

        // Check if status has changed to delivered, with correct timestamp
        const updatedEmailRecipient = await models.EmailRecipient.findOne({
            id: emailRecipient.id
        }, {require: true});

        // Not mark as failed
        assert.equal(initialModel.get('failed_at'), null);
    });

    it('Can handle complaint events', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);
        const emailId = emailBatch.email_id;

        const emailRecipient = fixtureManager.get('email_recipients', 0);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);

        // Check not unsubscribed
        const memberInitial = await membersService.api.members.get({id: memberId}, {withRelated: ['newsletters']});
        assert.notEqual(memberInitial.related('newsletters').length, 0, 'This test requires a member that is subscribed to at least one newsletter');

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
            // unix timestamp
            timestamp: Math.round(timestamp.getTime() / 1000)
        }];

        // Fire event processing
        // We use offloading to have correct coverage and usage of worker thread
        const result = await run({
            domainEvents
        });
        assert.equal(result.complained, 1);
        assert.deepEqual(result.emailIds, [emailId]);
        assert.deepEqual(result.memberIds, [memberId]);

        // Now wait for events processed
        await sleep(200);

        // Check if unsubscribed
        const member = await membersService.api.members.get({id: memberId}, {withRelated: ['newsletters']});
        assert.equal(member.related('newsletters').length, 0);
    });

    it('Can handle unsubscribe events', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);
        const emailId = emailBatch.email_id;

        const emailRecipient = fixtureManager.get('email_recipients', 0);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);

        // Reset
        await membersService.api.members.update({newsletters: [
            {
                id: fixtureManager.get('newsletters', 0).id
            }
        ]}, {id: memberId});

        // Check not unsubscribed
        const memberInitial = await membersService.api.members.get({id: memberId}, {withRelated: ['newsletters']});
        assert.notEqual(memberInitial.related('newsletters').length, 0, 'This test requires a member that is subscribed to at least one newsletter');

        events = [{
            event: 'unsubscribed',
            recipient: emailRecipient.member_email,
            'user-variables': {
                'email-id': emailId
            },
            message: {
                headers: {
                    'message-id': providerId
                }
            },
            // unix timestamp
            timestamp: Math.round(timestamp.getTime() / 1000)
        }];

        // Fire event processing
        // We use offloading to have correct coverage and usage of worker thread
        const result = await run({
            domainEvents
        });
        assert.equal(result.unsubscribed, 1);
        assert.deepEqual(result.emailIds, [emailId]);
        assert.deepEqual(result.memberIds, [memberId]);

        // Now wait for events processed
        await sleep(200);

        // Check if unsubscribed
        const member = await membersService.api.members.get({id: memberId}, {withRelated: ['newsletters']});
        assert.equal(member.related('newsletters').length, 0);
    });

    it('Can handle unknown events', async function () {
        const emailBatch = fixtureManager.get('email_batches', 0);
        const emailId = emailBatch.email_id;

        const emailRecipient = fixtureManager.get('email_recipients', 0);
        assert(emailRecipient.batch_id === emailBatch.id);
        const memberId = emailRecipient.member_id;
        const providerId = emailBatch.provider_id;
        const timestamp = new Date(2000, 0, 1);

        events = [{
            event: 'ceci-nest-pas-un-event',
            recipient: emailRecipient.member_email,
            'user-variables': {
                'email-id': emailId
            },
            message: {
                headers: {
                    'message-id': providerId
                }
            },
            // unix timestamp
            timestamp: Math.round(timestamp.getTime() / 1000)
        }];

        // Fire event processing
        // We use offloading to have correct coverage and usage of worker thread
        const result = await run({
            domainEvents
        });
        assert.equal(result.unhandled, 1);
        assert.deepEqual(result.emailIds, []);
        assert.deepEqual(result.memberIds, []);
    });
});
