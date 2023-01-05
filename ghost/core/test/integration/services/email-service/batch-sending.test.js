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
const mobileDocWithPaywall = '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["paywall",{}]],"sections":[[1,"p",[[0,[],0,"Free content"]]],[10,0],[1,"p",[[0,[],0,"Members content"]]]]}';
const configUtils = require('../../../utils/configUtils');
const {settingsCache} = require('../../../../core/server/services/settings-helpers');

function sortBatches(a, b) {
    const aId = a.get('provider_id');
    const bId = b.get('provider_id');
    if (aId === null) {
        return 1;
    }
    if (bId === null) {
        return -1;
    }
    return aId.localeCompare(bId);
}

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
    assert(!!emailModel);

    return emailModel;
}

async function retryEmail(emailId) {
    await agent.put(`emails/${emailId}/retry`)
        .expectStatus(200);
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

    before(async function () {
        mockManager.mockSetting('mailgun_api_key', 'test');
        mockManager.mockSetting('mailgun_domain', 'example.com');
        mockManager.mockSetting('mailgun_base_url', 'test');
        mockManager.mockMail();

        // We need to stub the Mailgun client before starting Ghost
        sinon.stub(MailgunClient.prototype, 'getInstance').returns({
            // @ts-ignore
            messages: {
                create: async () => {
                    return await stubbedSend();
                }
            }
        });

        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    after(function () {
        mockManager.restore();
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

    it('Doesn\'t include members created after the email in the batches', async function () {
        // If we create a new member (e.g. a member that was imported) after the email was created, they should not be included in the email

        // Prepare a post and email model
        const completedPromise = jobManager.awaitCompletion('batch-sending-service-job');
        const emailModel = await createPublishedPostEmail();

        // Create a new member that is subscribed
        const laterMember = await models.Member.add({
            name: 'Member that is added later',
            email: 'member-that-is-added-later@example.com',
            status: 'free',
            newsletters: [{
                id: fixtureManager.get('newsletters', 0).id
            }]
        });

        // Check the batches are not yet generated
        const earlyBatches = await models.EmailBatch.findAll({filter: `email_id:${emailModel.id}`});
        assert.equal(earlyBatches.models.length, 0);

        // Await sending job
        await completedPromise;

        await emailModel.refresh();
        assert.equal(emailModel.get('status'), 'submitted');
        assert.equal(emailModel.get('email_count'), 4);

        // Did we create batches?
        const batches = await models.EmailBatch.findAll({filter: `email_id:${emailModel.id}`});
        assert.equal(batches.models.length, 1);

        // Did we create recipients?
        const emailRecipients = await models.EmailRecipient.findAll({filter: `email_id:${emailModel.id}`});
        assert.equal(emailRecipients.models.length, 4);

        for (const recipient of emailRecipients.models) {
            assert.equal(recipient.get('batch_id'), batches.models[0].id);
            assert.notEqual(recipient.get('member_id'), laterMember.id);
        }

        // Create a new email and see if it is included now
        const completedPromise2 = jobManager.awaitCompletion('batch-sending-service-job');
        const emailModel2 = await createPublishedPostEmail();
        await completedPromise2;
        await emailModel2.refresh();
        assert.equal(emailModel2.get('email_count'), 5);
        const emailRecipients2 = await models.EmailRecipient.findAll({filter: `email_id:${emailModel2.id}`});
        assert.equal(emailRecipients2.models.length, emailRecipients.models.length + 1);
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
        assert(emailModel.get('status'), 'submitted');
        assert.equal(emailModel.get('email_count'), 5);

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
        assert.equal(emailRecipientsFirstBatch.models.length, 3);

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
        assert.equal(emailModel.get('status'), 'submitted');
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
        assert.equal(emailModel.get('status'), 'submitted');
        assert.equal(emailModel.get('email_count'), 5);

        // Did we create batches?
        const batches = await models.EmailBatch.findAll({filter: `email_id:${emailModel.id}`});
        assert.equal(batches.models.length, 5);

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

    it('One failed batch marks the email as failed and allows for a retry', async function () {
        MailgunEmailProvider.BATCH_SIZE = 1;
        let counter = 0;
        stubbedSend = async function () {
            counter += 1;
            if (counter === 4) {
                throw {
                    status: 500,
                    message: 'Internal server error',
                    details: 'Something went wrong'
                };
            }
            return {
                id: 'stubbed-email-id-' + counter
            };
        };

        // Prepare a post and email model
        let completedPromise = jobManager.awaitCompletion('batch-sending-service-job');
        const emailModel = await createPublishedPostEmail();

        assert.equal(emailModel.get('source_type'), 'mobiledoc');
        assert(emailModel.get('subject'));
        assert(emailModel.get('from'));

        // Await sending job
        await completedPromise;

        await emailModel.refresh();
        assert.equal(emailModel.get('status'), 'failed');
        assert.equal(emailModel.get('email_count'), 5);

        // Did we create batches?
        let batches = await models.EmailBatch.findAll({filter: `email_id:${emailModel.id}`});
        assert.equal(batches.models.length, 5);

        // sort batches by id because findAll doesn't have order option
        batches.models.sort(sortBatches);

        let emailRecipients = [];

        // Check all batches are in send state
        let count = 0;
        for (const batch of batches.models) {
            count += 1;

            if (count === 5) {
                assert.equal(batch.get('provider_id'), null);
                assert.equal(batch.get('status'), 'failed');
                assert.equal(batch.get('error_status_code'), 500);
                assert.equal(batch.get('error_message'), 'Internal server error:Something went wrong');
                const errorData = JSON.parse(batch.get('error_data'));
                assert.equal(errorData.error.status, 500);
                assert.deepEqual(errorData.messageData.to.length, 1);
            } else {
                if (count === 4) {
                    // We sorted on provider_id so the count is slightly off
                    assert.equal(batch.get('provider_id'), 'stubbed-email-id-5');
                } else {
                    assert.equal(batch.get('provider_id'), 'stubbed-email-id-' + count);
                }

                assert.equal(batch.get('status'), 'submitted');
                assert.equal(batch.get('error_status_code'), null);
                assert.equal(batch.get('error_message'), null);
                assert.equal(batch.get('error_data'), null);
            }

            assert.equal(batch.get('member_segment'), null);

            // Did we create recipients?
            const batchRecipients = await models.EmailRecipient.findAll({filter: `email_id:${emailModel.id}+batch_id:${batch.id}`});
            assert.equal(batchRecipients.models.length, 1);

            emailRecipients.push(...batchRecipients.models);
        }

        // Check members are unique
        let memberIds = emailRecipients.map(recipient => recipient.get('member_id'));
        assert.equal(memberIds.length, _.uniq(memberIds).length);

        completedPromise = jobManager.awaitCompletion('batch-sending-service-job');
        await retryEmail(emailModel.id);
        await completedPromise;

        await emailModel.refresh();
        batches = await models.EmailBatch.findAll({filter: `email_id:${emailModel.id}`});

        // sort batches by provider_id (nullable) because findAll doesn't have order option
        batches.models.sort(sortBatches);

        assert.equal(emailModel.get('status'), 'submitted');
        assert.equal(emailModel.get('email_count'), 5);

        // Did we keep the batches?
        batches = await models.EmailBatch.findAll({filter: `email_id:${emailModel.id}`});

        // sort batches by provider_id (nullable) because findAll doesn't have order option
        batches.models.sort(sortBatches);
        assert.equal(batches.models.length, 5);

        emailRecipients = [];

        // Check all batches are in send state
        for (const batch of batches.models) {
            assert(!!batch.get('provider_id'));
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
        memberIds = emailRecipients.map(recipient => recipient.get('member_id'));
        assert.equal(memberIds.length, _.uniq(memberIds).length);
    });

    it('Cannot send an email if verification is required', async function () {
        // First enable import thresholds
        configUtils.set('hostSettings:emailVerification', {
            apiThreshold: 100,
            adminThreshold: 100,
            importThreshold: 100,
            verified: false,
            escalationAddress: 'test@example.com'
        });

        // We stub a lot of imported members to mimic a large import that is in progress but is not yet finished
        // the current verification required value is off. But when creating an email, we need to update that check to avoid this issue.
        const members = require('../../../../core/server/services/members');
        const events = members.api.events;
        const getSignupEvents = sinon.stub(events, 'getSignupEvents').resolves({
            meta: {
                pagination: {
                    total: 100000
                }
            }
        });

        assert.equal(settingsCache.get('email_verification_required'), false, 'This test requires email verification to be disabled initially');

        const post = {
            title: 'A random test post',
            status: 'draft',
            feature_image_alt: 'Testing sending',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            created_at: moment().subtract(2, 'days').toISOString(),
            updated_at: moment().subtract(2, 'days').toISOString(),
            created_by: ObjectId().toHexString(),
            updated_by: ObjectId().toHexString()
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
        await agent.put(`posts/${id}/?newsletter=${newsletterSlug}`)
            .body({posts: [updatedPost]})
            .expectStatus(403);
        sinon.assert.calledOnce(getSignupEvents);
        assert.equal(settingsCache.get('email_verification_required'), true);

        configUtils.restore();
    });

    // TODO: Link tracking
    // TODO: Replacement fallbacks
});
