require('should');
const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const moment = require('moment');
const ObjectId = require('bson-objectid').default;
const models = require('../../../../core/server/models');
const sinon = require('sinon');
const assert = require('assert');
const MailgunClient = require('@tryghost/mailgun-client/lib/mailgun-client');
const jobManager = require('../../../../core/server/services/jobs/job-service');
let agent;
const _ = require('lodash');
const {MailgunEmailProvider} = require('@tryghost/email-service');

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const mobileDocWithPaywall = '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["paywall",{}]],"sections":[[1,"p",[[0,[],0,"Free content"]]],[10,0],[1,"p",[[0,[],0,"Members content"]]]]}';

async function createPublishedPostEmail(settings = {}, email_recipient_filter) {
    const post = {
        title: 'A random test post',
        status: 'draft',
        feature_image_alt: 'Testing sending',
        feature_image_caption: 'Testing <b>feature image caption</b>',
        created_at: moment().subtract(2, 'days').toISOString(),
        updated_at: moment().subtract(2, 'days').toISOString(),
        created_by: ObjectId().toHexString(),
        updated_by: ObjectId().toHexString(),
        ...settings
    };

    const res = await agent.post('posts/')
        .body({posts: [post]})
        .expectStatus(201);

    const id = res.body.posts[0].id;

    const updatedPost = {
        status: 'published',
        updated_at: res.body.posts[0].updated_at
    };

    const newsletterSlug = fixtureManager.get('newsletters', 0).slug;
    await agent.put(`posts/${id}/?newsletter=${newsletterSlug}${email_recipient_filter ? `&email_segment=${email_recipient_filter}` : ''}`)
        .body({posts: [updatedPost]})
        .expectStatus(200);

    const emailModel = await models.Email.findOne({
        post_id: id
    });
    should.exist(emailModel);

    return emailModel;
}

describe('Batch sending tests', function () {
    let stubbedSend;

    beforeEach(function () {
        stubbedSend = async function () {
            return {
                id: 'stubbed-email-id'
            };
        };
    });

    afterEach(function () {
        // warn: don't restore mockmanager as the would clear our prototype stubs
        // mockManager.restore();
    });

    before(async function () {
        // We need to stub the Mailgun client before starting Ghost
        sinon.stub(MailgunClient.prototype, 'send').callsFake(async function () {
            return stubbedSend();
        });
        sinon.stub(MailgunClient.prototype, 'getInstance').returns({});

        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    it('Can send a scheduled post email', async function () {
        // Prepare a post and email model
        const completedPromise = jobManager.awaitCompletion('batch-sending-service-job');
        const emailModel = await createPublishedPostEmail();

        assert.equal(emailModel.get('source_type'), 'mobiledoc');
        assert(emailModel.get('subject'));
        assert(emailModel.get('from'));

        // Await sending job
        await completedPromise;

        await emailModel.refresh();
        assert.equal(emailModel.get('status'), 'submitted');
        assert.equal(emailModel.get('email_count'), 4);

        // Did we create batches?
        const batches = await models.EmailBatch.findAll({filter: `email_id:${emailModel.id}`});
        assert.equal(batches.models.length, 1);

        // Check all batches are in send state
        for (const batch of batches.models) {
            assert.equal(batch.get('provider_id'), 'stubbed-email-id');
            assert.equal(batch.get('status'), 'submitted');
            assert.equal(batch.get('member_segment'), null);

            assert.equal(batch.get('error_status_code'), null);
            assert.equal(batch.get('error_message'), null);
            assert.equal(batch.get('error_data'), null);
        }

        // Did we create recipients?
        const emailRecipients = await models.EmailRecipient.findAll({filter: `email_id:${emailModel.id}`});
        assert.equal(emailRecipients.models.length, 4);

        for (const recipient of emailRecipients.models) {
            assert.equal(recipient.get('batch_id'), batches.models[0].id);
        }

        // Check members are unique
        const memberIds = emailRecipients.models.map(recipient => recipient.get('member_id'));
        assert.equal(memberIds.length, _.uniq(memberIds).length);
    });

    it('Splits recipients in free and paid batch', async function () {
        // Prepare a post and email model
        const completedPromise = jobManager.awaitCompletion('batch-sending-service-job');
        const emailModel = await createPublishedPostEmail({
            // Requires a paywall
            mobiledoc: mobileDocWithPaywall,
            // Required to trigger the paywall
            visibility: 'paid'
        });

        assert.equal(emailModel.get('source_type'), 'mobiledoc');
        assert(emailModel.get('subject'));
        assert(emailModel.get('from'));

        // Await sending job
        await completedPromise;

        await emailModel.refresh();
        emailModel.get('status').should.eql('submitted');
        assert.equal(emailModel.get('email_count'), 4);

        // Did we create batches?
        const batches = await models.EmailBatch.findAll({filter: `email_id:${emailModel.id}`});
        assert.equal(batches.models.length, 2);

        // Check all batches are in send state
        const firstBatch = batches.models[0];
        assert.equal(firstBatch.get('provider_id'), 'stubbed-email-id');
        assert.equal(firstBatch.get('status'), 'submitted');
        assert.equal(firstBatch.get('member_segment'), 'status:free');
        assert.equal(firstBatch.get('error_status_code'), null);
        assert.equal(firstBatch.get('error_message'), null);
        assert.equal(firstBatch.get('error_data'), null);

        const secondBatch = batches.models[1];
        assert.equal(secondBatch.get('provider_id'), 'stubbed-email-id');
        assert.equal(secondBatch.get('status'), 'submitted');
        assert.equal(secondBatch.get('member_segment'), 'status:-free');
        assert.equal(secondBatch.get('error_status_code'), null);
        assert.equal(secondBatch.get('error_message'), null);
        assert.equal(secondBatch.get('error_data'), null);

        // Did we create recipients?
        const emailRecipientsFirstBatch = await models.EmailRecipient.findAll({filter: `email_id:${emailModel.id}+batch_id:${firstBatch.id}`});
        assert.equal(emailRecipientsFirstBatch.models.length, 2);

        const emailRecipientsSecondBatch = await models.EmailRecipient.findAll({filter: `email_id:${emailModel.id}+batch_id:${secondBatch.id}`});
        assert.equal(emailRecipientsSecondBatch.models.length, 2);

        // Check members are unique
        const memberIds = [...emailRecipientsFirstBatch.models, ...emailRecipientsSecondBatch.models].map(recipient => recipient.get('member_id'));
        assert.equal(memberIds.length, _.uniq(memberIds).length);
    });

    it('Only sends to members in email recipient filter', async function () {
        // Prepare a post and email model
        const completedPromise = jobManager.awaitCompletion('batch-sending-service-job');
        const emailModel = await createPublishedPostEmail({
            // Requires a paywall
            mobiledoc: mobileDocWithPaywall,
            // Required to trigger the paywall
            visibility: 'paid'
        }, 'status:-free');

        assert.equal(emailModel.get('source_type'), 'mobiledoc');
        assert(emailModel.get('subject'));
        assert(emailModel.get('from'));

        // Await sending job
        await completedPromise;

        await emailModel.refresh();
        emailModel.get('status').should.eql('submitted');
        assert.equal(emailModel.get('email_count'), 2);

        // Did we create batches?
        const batches = await models.EmailBatch.findAll({filter: `email_id:${emailModel.id}`});
        assert.equal(batches.models.length, 1);

        // Check all batches are in send state
        const firstBatch = batches.models[0];
        assert.equal(firstBatch.get('provider_id'), 'stubbed-email-id');
        assert.equal(firstBatch.get('status'), 'submitted');
        assert.equal(firstBatch.get('member_segment'), 'status:-free');
        assert.equal(firstBatch.get('error_status_code'), null);
        assert.equal(firstBatch.get('error_message'), null);
        assert.equal(firstBatch.get('error_data'), null);

        // Did we create recipients?
        const emailRecipients = await models.EmailRecipient.findAll({filter: `email_id:${emailModel.id}`});
        assert.equal(emailRecipients.models.length, 2);

        // Check members are unique
        const memberIds = emailRecipients.models.map(recipient => recipient.get('member_id'));
        assert.equal(_.uniq(memberIds).length, 2);
    });

    it('Splits up in batches according to email provider batch size', async function () {
        MailgunEmailProvider.BATCH_SIZE = 1;

        // Prepare a post and email model
        const completedPromise = jobManager.awaitCompletion('batch-sending-service-job');
        const emailModel = await createPublishedPostEmail();

        assert.equal(emailModel.get('source_type'), 'mobiledoc');
        assert(emailModel.get('subject'));
        assert(emailModel.get('from'));

        // Await sending job
        await completedPromise;

        await emailModel.refresh();
        emailModel.get('status').should.eql('submitted');
        assert.equal(emailModel.get('email_count'), 4);

        // Did we create batches?
        const batches = await models.EmailBatch.findAll({filter: `email_id:${emailModel.id}`});
        assert.equal(batches.models.length, 4);

        const emailRecipients = [];

        // Check all batches are in send state
        for (const batch of batches.models) {
            assert.equal(batch.get('provider_id'), 'stubbed-email-id');
            assert.equal(batch.get('status'), 'submitted');
            assert.equal(batch.get('member_segment'), null);

            assert.equal(batch.get('error_status_code'), null);
            assert.equal(batch.get('error_message'), null);
            assert.equal(batch.get('error_data'), null);

            // Did we create recipients?
            const batchRecipients = await models.EmailRecipient.findAll({filter: `email_id:${emailModel.id}+batch_id:${batch.id}`});
            assert.equal(batchRecipients.models.length, 1);

            emailRecipients.push(...batchRecipients.models);
        }

        // Check members are unique
        const memberIds = emailRecipients.map(recipient => recipient.get('member_id'));
        assert.equal(memberIds.length, _.uniq(memberIds).length);
    });
});
