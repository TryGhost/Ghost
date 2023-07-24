const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const moment = require('moment');
const ObjectId = require('bson-objectid').default;
const models = require('../../../../core/server/models');
const sinon = require('sinon');
const assert = require('assert/strict');
const jobManager = require('../../../../core/server/services/jobs/job-service');
const _ = require('lodash');
const configUtils = require('../../../utils/configUtils');
const {settingsCache} = require('../../../../core/server/services/settings-helpers');
const DomainEvents = require('@tryghost/domain-events');
const emailService = require('../../../../core/server/services/email-service');
const {mockSetting, stripeMocker} = require('../../../utils/e2e-framework-mock-manager');
const {sendEmail, sendFailedEmail, matchEmailSnapshot, getDefaultNewsletter, retryEmail} = require('../../../utils/batch-email-utils');

const mobileDocExample = '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"Hello world"]]]],"ghostVersion":"4.0"}';
const mobileDocWithPaywall = '{"version":"0.3.1","markups":[],"atoms":[],"cards":[["paywall",{}]],"sections":[[1,"p",[[0,[],0,"Free content"]]],[10,0],[1,"p",[[0,[],0,"Members content"]]]]}';
const mobileDocWithFreeMemberOnly = '{"version":"0.3.1","atoms":[],"cards":[["email-cta",{"showButton":false,"showDividers":true,"segment":"status:free","alignment":"left","html":"<p>This is for free members only</p>"}]],"markups":[],"sections":[[1,"p",[[0,[],0,"Hello world"]]],[10,0],[1,"p",[[0,[],0,"Bye."]]]],"ghostVersion":"4.0"}';
const mobileDocWithPaidMemberOnly = '{"version":"0.3.1","atoms":[],"cards":[["email-cta",{"showButton":false,"showDividers":true,"segment":"status:-free","alignment":"left","html":"<p>This is for paid members only</p>"}]],"markups":[],"sections":[[1,"p",[[0,[],0,"Hello world"]]],[10,0],[1,"p",[[0,[],0,"Bye."]]]],"ghostVersion":"4.0"}';
const mobileDocWithPaidAndFreeMemberOnly = '{"version":"0.3.1","atoms":[],"cards":[["email-cta",{"showButton":false,"showDividers":true,"segment":"status:free","alignment":"left","html":"<p>This is for free members only</p>"}],["email-cta",{"showButton":false,"showDividers":true,"segment":"status:-free","alignment":"left","html":"<p>This is for paid members only</p>"}]],"markups":[],"sections":[[1,"p",[[0,[],0,"Hello world"]]],[10,0],[10,1],[1,"p",[[0,[],0,"Bye."]]]],"ghostVersion":"4.0"}';
const mobileDocWithFreeMemberOnlyAndPaywall = '{"version":"0.3.1","atoms":[],"cards":[["email-cta",{"showButton":false,"showDividers":true,"segment":"status:free","alignment":"left","html":"<p>This is for free members only</p>"}],["paywall",{}]],"markups":[],"sections":[[1,"p",[[0,[],0,"Hello world"]]],[10,0],[1,"p",[[0,[],0,"Bye."]]],[10,1],[1,"p",[[0,[],0,"This is after the paywall."]]]],"ghostVersion":"4.0"}';
const mobileDocWithReplacements = '{"version":"0.3.1","atoms":[],"cards":[["email",{"html":"<p>Hey {first_name, \\"there\\"}, Hey {first_name},</p>"}]],"markups":[],"sections":[[1,"p",[[0,[],0,"Hello {first_name},"]]],[10,0]],"ghostVersion":"4.0"}';

let agent;
let stubbedSend;
let frontendAgent;

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

/**
 * Test amount of batches and segmenting for a given email
 *
 * @param {object} settings
 * @param {string|null} email_recipient_filter
 * @param {{recipients: number, segment: string | null}[]} expectedBatches
 */
async function testEmailBatches(settings, email_recipient_filter, expectedBatches) {
    const {emailModel} = await sendEmail(agent, settings, email_recipient_filter);

    assert.equal(emailModel.get('source_type'), 'mobiledoc');
    assert(emailModel.get('subject'));
    assert(emailModel.get('from'));
    const expectedTotal = expectedBatches.reduce((acc, batch) => acc + batch.recipients, 0);
    assert.equal(emailModel.get('email_count'), expectedTotal, 'This email should have an email_count of ' + expectedTotal + ' recipients');

    // Did we create batches?
    const batches = await models.EmailBatch.findAll({filter: `email_id:${emailModel.id}`});
    assert.equal(batches.models.length, expectedBatches.length);
    const remainingBatches = batches.models.slice();
    const emailRecipients = [];

    for (const expectedBatch of expectedBatches) {
        // Check all batches are in send state
        const index = remainingBatches.findIndex(b => b.get('member_segment') === expectedBatch.segment);
        assert(index !== -1, `Could not find batch with segment ${expectedBatch.segment}`);
        const firstBatch = remainingBatches[index];
        remainingBatches.splice(index, 1);

        assert.equal(firstBatch.get('provider_id'), 'stubbed-email-id');
        assert.equal(firstBatch.get('status'), 'submitted');
        assert.equal(firstBatch.get('member_segment'), expectedBatch.segment);
        assert.equal(firstBatch.get('error_status_code'), null);
        assert.equal(firstBatch.get('error_message'), null);
        assert.equal(firstBatch.get('error_data'), null);

        // Did we create recipients?
        const emailRecipientsFirstBatch = await models.EmailRecipient.findAll({filter: `email_id:${emailModel.id}+batch_id:${firstBatch.id}`});
        assert.equal(emailRecipientsFirstBatch.models.length, expectedBatch.recipients);

        emailRecipients.push(...emailRecipientsFirstBatch.models);
    }

    // Check members are unique in all batches
    const memberIds = emailRecipients.map(recipient => recipient.get('member_id'));
    assert.equal(memberIds.length, _.uniq(memberIds).length);
}

describe('Batch sending tests', function () {
    let linkRedirectService, linkRedirectRepository, linkTrackingService, linkClickRepository;
    let ghostServer;

    beforeEach(function () {
        configUtils.set('bulkEmail:batchSize', 100);
        stubbedSend = sinon.fake.resolves({
            id: 'stubbed-email-id'
        });
        mockManager.mockMail();
        mockManager.mockMailgun(function () {
            // Allows for setting stubbedSend during tests
            return stubbedSend.call(this, ...arguments);
        });
        mockManager.mockStripe();
    });

    afterEach(async function () {
        await configUtils.restore();
        await models.Settings.edit([{
            key: 'email_verification_required',
            value: false
        }], {context: {internal: true}});
        mockManager.restore();
    });

    before(async function () {
        const agents = await agentProvider.getAgentsWithFrontend();
        agent = agents.adminAgent;
        frontendAgent = agents.frontendAgent;
        ghostServer = agents.ghostServer;

        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();

        linkRedirectService = require('../../../../core/server/services/link-redirection');
        linkRedirectRepository = linkRedirectService.linkRedirectRepository;

        linkTrackingService = require('../../../../core/server/services/link-tracking');
        linkClickRepository = linkTrackingService.linkClickRepository;
    });

    after(async function () {
        mockManager.restore();
        await ghostServer.stop();
    });

    it('Can send a scheduled post email', async function () {
        // Prepare a post and email model
        const {emailModel} = await sendEmail(agent);

        assert.equal(emailModel.get('source_type'), 'mobiledoc');
        assert(emailModel.get('subject'));
        assert(emailModel.get('from'));
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

    it('Protects the email job from being run multiple times at the same time', async function () {
        this.retries(1);
        // Prepare a post and email model
        const {emailModel} = await sendEmail(agent);

        // Retry sending a couple of times
        const promises = [];
        for (let i = 0; i < 100; i++) {
            promises.push(emailService.service.retryEmail(emailModel));
        }
        await Promise.all(promises);

        // Await sending job
        await jobManager.allSettled();

        await emailModel.refresh();
        assert.equal(emailModel.get('status'), 'submitted');
        assert.equal(emailModel.get('email_count'), 4);

        // Did we create batches?
        const batches = await models.EmailBatch.findAll({filter: `email_id:${emailModel.id}`});
        assert.equal(batches.models.length, 1);
    });

    it('Doesn\'t include members created after the email in the batches', async function () {
        // If we create a new member (e.g. a member that was imported) after the email was created, they should not be included in the email
        const addStub = sinon.stub(models.Email, 'add');
        let laterMember;
        addStub.callsFake(async function () {
            const r = await addStub.wrappedMethod.call(this, ...arguments);

            // Create a new member that is subscribed
            laterMember = await models.Member.add({
                name: 'Member that is added later',
                email: 'member-that-is-added-later@example.com',
                status: 'free',
                newsletters: [{
                    id: fixtureManager.get('newsletters', 0).id
                }],
                email_disabled: false
            });

            return r;
        });

        const {emailModel} = await sendEmail(agent);

        assert(addStub.calledOnce);
        assert.ok(laterMember);
        addStub.restore();

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
        const {emailModel: emailModel2} = await sendEmail(agent);
        assert.equal(emailModel2.get('email_count'), 5);
        const emailRecipients2 = await models.EmailRecipient.findAll({filter: `email_id:${emailModel2.id}`});
        assert.equal(emailRecipients2.models.length, emailRecipients.models.length + 1);
    });

    it('Splits recipients in free and paid batch', async function () {
        await testEmailBatches({
            // Requires a paywall = different content for paid and free members
            mobiledoc: mobileDocWithPaywall,
            // Required to trigger the paywall
            visibility: 'paid'
        }, null, [
            {segment: 'status:free', recipients: 3},
            {segment: 'status:-free', recipients: 2}
        ]);
    });

    it('Splits recipients in free and paid batch when including free member only content', async function () {
        await testEmailBatches({
            mobiledoc: mobileDocWithFreeMemberOnly // = different content for paid and free members (extra content for free in this case)
        }, null, [
            {segment: 'status:free', recipients: 3},
            {segment: 'status:-free', recipients: 2}
        ]);
    });

    it('Splits recipients in free and paid batch when including paid member only content', async function () {
        await testEmailBatches({
            mobiledoc: mobileDocWithPaidMemberOnly // = different content for paid and free members (extra content for paid in this case)
        }, null, [
            {segment: 'status:free', recipients: 3},
            {segment: 'status:-free', recipients: 2}
        ]);
    });

    it('Splits recipients in free and paid batch when including paid member only content', async function () {
        await testEmailBatches({
            mobiledoc: mobileDocWithPaidAndFreeMemberOnly // = different content for paid and free members
        }, null, [
            {segment: 'status:free', recipients: 3},
            {segment: 'status:-free', recipients: 2}
        ]);
    });

    it('Splits recipients in free and paid batch when including free members only content with paywall', async function () {
        await testEmailBatches({
            mobiledoc: mobileDocWithFreeMemberOnlyAndPaywall, // = different content for paid and free members (extra content for paid in this case + a paywall)
            // Required to trigger the paywall
            visibility: 'paid'
        }, null, [
            {segment: 'status:free', recipients: 3},
            {segment: 'status:-free', recipients: 2}
        ]);
    });

    it('Does not split recipient in free and paid batch if email is identical', async function () {
        await testEmailBatches({
            mobiledoc: mobileDocExample // = same content for free and paid, no need to split batches
        }, null, [
            {segment: null, recipients: 5}
        ]);
    });

    it('Only sends to paid members if recipient filter is applied', async function () {
        await testEmailBatches({
            mobiledoc: mobileDocExample // = same content for free and paid, no need to split batches
        }, 'status:-free', [
            {segment: null, recipients: 2}
        ]);
    });

    it('Only sends to members with a specific label', async function () {
        await testEmailBatches({
            mobiledoc: mobileDocExample // = same content for free and paid, no need to split batches
        }, 'label:label-1', [
            {segment: null, recipients: 1} // 1 member was subscribed, one member is not subscribed
        ]);
    });

    it('Only sends to members with a specific label and paid content', async function () {
        await testEmailBatches({
            mobiledoc: mobileDocWithPaidMemberOnly // = different content for paid and free members (extra content for paid in this case)
        }, 'label:label-1', [
            {segment: 'status:free', recipients: 1} // The only member with this label is a free member
        ]);
    });

    it('Only sends to members with a specific label and paywall', async function () {
        await testEmailBatches({
            mobiledoc: mobileDocWithPaywall,
            visibility: 'paid'
        }, 'label:label-1', [
            {segment: 'status:free', recipients: 1} // The only member with this label is a free member
        ]);
    });

    it('Can handle OR filter in email recipient filter and split content', async function () {
        await testEmailBatches({
            mobiledoc: mobileDocWithPaywall, // = content should be different for free and paid members
            visibility: 'paid'
        }, 'status:-free,label:label-1', [
            {segment: 'status:free', recipients: 1}, // The only member with this label is a free member
            {segment: 'status:-free', recipients: 2} // The only member with this label is a free member
        ]);
    });

    it('Can handle OR filter in email recipient filter without split content', async function () {
        await testEmailBatches({
            mobiledoc: mobileDocExample // = content is same for free and paid members
        }, 'status:-free,label:label-1', [
            {segment: null, recipients: 3} // 2 paid members + 1 free member with the label
        ]);
    });

    it('Only sends to paid members if recipient filter is applied in combination with free member only content', async function () {
        // Tests if the batch generator doesn't go insane if we include a free memebr only content for an email that is only send to paid members
        await testEmailBatches({
            mobiledoc: mobileDocWithFreeMemberOnly
        }, 'status:-free', [
            {segment: 'status:-free', recipients: 2}
        ]);
    });

    it('Splits up in batches according to email provider batch size', async function () {
        configUtils.set('bulkEmail:batchSize', 1);
        await testEmailBatches({
            mobiledoc: mobileDocExample
        }, null, [
            {segment: null, recipients: 1},
            {segment: null, recipients: 1},
            {segment: null, recipients: 1},
            {segment: null, recipients: 1},
            {segment: null, recipients: 1}
        ]);
    });

    it('Splits up in batches according to email provider batch size with paid and free segments', async function () {
        configUtils.set('bulkEmail:batchSize', 1);
        await testEmailBatches({
            mobiledoc: mobileDocWithPaidMemberOnly
        }, null, [
            // 2 paid
            {segment: 'status:-free', recipients: 1},
            {segment: 'status:-free', recipients: 1},

            // 3 free
            {segment: 'status:free', recipients: 1},
            {segment: 'status:free', recipients: 1},
            {segment: 'status:free', recipients: 1}
        ]);
    });

    it('One failed batch marks the email as failed and allows for a retry', async function () {
        configUtils.set('bulkEmail:batchSize', 1);
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
        const {emailModel} = await sendFailedEmail(agent);
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
                assert.equal(batch.get('error_message'), 'Internal server error: Something went wrong');
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

        await retryEmail(agent, emailModel.id);
        await jobManager.allSettled();

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
        sinon.assert.calledTwice(getSignupEvents);
        assert.equal(settingsCache.get('email_verification_required'), true);

        await configUtils.restore();
    });

    describe('Analytics', function () {
        it('Adds link tracking to all links in a post', async function () {
            const {emailModel, html, plaintext, recipientData} = await sendEmail(agent);
            const memberUuid = recipientData.uuid;
            const member = await models.Member.findOne({uuid: memberUuid});

            // Test if all links are replaced and contain the member id
            const cheerio = require('cheerio');
            const $ = cheerio.load(html);
            const links = await linkRedirectRepository.getAll({filter: 'post_id:' + emailModel.get('post_id')});

            for (const el of $('a').toArray()) {
                const href = $(el).attr('href');

                if (href.includes('/unsubscribe/?uuid')) {
                    assert(href.includes('?uuid=' + memberUuid), 'Subscribe link need to contain uuid, got ' + href);
                    continue;
                }

                // Check if the link is a tracked link
                assert(href.includes('?m=' + memberUuid), href + ' is not tracked');

                // Check if this link is also present in the plaintext version (with the right replacements)
                assert(plaintext.includes(href), href + ' is not present in the plaintext version');

                // Check stored in the database
                const u = new URL(href);
                const link = links.find(l => l.from.pathname === u.pathname);
                assert(link, 'Link model not created for ' + href);

                // Mimic a click on a link
                const path = u.pathname + u.search;
                await frontendAgent.get(path)
                    .expect('Location', link.to.href)
                    .expect(302);

                // Wait for the link clicks to be processed
                await DomainEvents.allSettled();

                const clickEvent = await linkClickRepository.getAll({member_id: member.id, link_id: link.link_id.toHexString()});
                assert(clickEvent.length, 'Click event was not tracked for ' + link.from.href);
            }

            for (const link of links) {
                // Check ref added to all replaced links
                assert.match(link.to.search, /ref=/);
            }
        });

        it('Does not add outbound refs if disabled', async function () {
            mockManager.mockSetting('outbound_link_tagging', false);

            const {emailModel, html} = await sendEmail(agent);
            assert.match(html, /\m=/);
            const links = await linkRedirectRepository.getAll({filter: 'post_id:' + emailModel.get('post_id')});

            for (const link of links) {
                // Check ref not added to all replaced links
                assert.doesNotMatch(link.to.search, /ref=/);
            }
        });

        // Remove this test once outboundLinkTagging goes GA
        it('Does add outbound refs if disabled but flag is disabled', async function () {
            mockManager.mockLabsDisabled('outboundLinkTagging');
            mockManager.mockSetting('outbound_link_tagging', false);

            const {emailModel, html} = await sendEmail(agent);
            assert.match(html, /\m=/);
            const links = await linkRedirectRepository.getAll({filter: 'post_id:' + emailModel.get('post_id')});

            for (const link of links) {
                // Check ref not added to all replaced links
                assert.match(link.to.search, /ref=/);
            }
        });

        it('Does not add link tracking if disabled', async function () {
            mockManager.mockSetting('email_track_clicks', false);

            const {emailModel, html} = await sendEmail(agent);
            assert.doesNotMatch(html, /\m=/);
            const links = await linkRedirectRepository.getAll({filter: 'post_id:' + emailModel.get('post_id')});
            assert.equal(links.length, 0);
        });
    });

    describe('Replacements', function () {
        it('Does replace with and without fallback in both plaintext and html for member without name', async function () {
            // Create a new member without a first_name
            await models.Member.add({
                email: 'replacements-test-1@example.com',
                labels: [{name: 'replacements-tests'}],
                newsletters: [{
                    id: fixtureManager.get('newsletters', 0).id
                }],
                email_disabled: false
            });

            const {html, plaintext} = await sendEmail(agent, {
                mobiledoc: mobileDocWithReplacements
            }, 'label:replacements-tests');

            // Outside the email card, {first_name} is not replaced
            assert.match(html, /Hello {first_name},/);

            // Inside the email card with and without fallback, it is replaced
            assert.match(html, /Hey there, Hey ,/);

            // The unsubscribe link is replaced
            assert.match(html, /<a href="http:\/\/127.0.0.1:2369\/unsubscribe\/\?uuid=[a-z0-9-]+&newsletter=[a-z0-9-]+"/, 'Unsubscribe link not found in html');

            // Same for plaintext:
            assert.match(plaintext, /Hello {first_name},/);
            assert.match(plaintext, /Hey there, Hey ,/);
            assert.match(plaintext, /\[http:\/\/127.0.0.1:2369\/unsubscribe\/\?uuid=[a-z0-9-]+&newsletter=[a-z0-9-]+\]/, 'Unsubscribe link not found in plaintext');

            await matchEmailSnapshot();
        });

        it('Does replace with and without fallback in both plaintext and html for member with name', async function () {
            this.retries(1);
            // Create a new member without a first_name
            await models.Member.add({
                name: 'Simon Tester',
                email: 'replacements-test-2@example.com',
                labels: [{name: 'replacements-tests-2'}],
                newsletters: [{
                    id: fixtureManager.get('newsletters', 0).id
                }],
                email_disabled: false
            });

            const {html, plaintext} = await sendEmail(agent, {
                mobiledoc: mobileDocWithReplacements
            }, 'label:replacements-tests-2');

            // Outside the email card, {first_name} is not replaced
            assert.match(html, /Hello {first_name},/);

            // Inside the email card with and without fallback, it is replaced
            assert.match(html, /Hey Simon, Hey Simon,/);

            // The unsubscribe link is replaced
            assert.match(html, /<a href="http:\/\/127.0.0.1:2369\/unsubscribe\/\?uuid=[a-z0-9-]+&newsletter=[a-z0-9-]+"/, 'Unsubscribe link not found in html');

            // Same for plaintext:
            assert.match(plaintext, /Hello {first_name},/);
            assert.match(plaintext, /Hey Simon, Hey Simon,/);
            assert.match(plaintext, /\[http:\/\/127.0.0.1:2369\/unsubscribe\/\?uuid=[a-z0-9-]+&newsletter=[a-z0-9-]+\]/, 'Unsubscribe link not found in plaintext');

            await matchEmailSnapshot();
        });
    });

    describe('HTML-content', function () {
        it('Does not HTML escape feature_image_caption', async function () {
            const {html, plaintext} = await sendEmail(agent, {
                feature_image: 'https://example.com/image.jpg',
                feature_image_caption: 'Testing <b>feature image caption</b>'
            });
            // Check html contains text without escaping
            assert.match(html, /Testing <b>feature image caption<\/b>/);

            // Check plaintext version dropped the bold tag
            assert.match(plaintext, /Testing feature image caption/);

            await matchEmailSnapshot();
        });
    });

    describe('Newsletter settings', function () {
        it('Hides post title section if show_post_title_section is false', async function () {
            const defaultNewsletter = await getDefaultNewsletter();
            await models.Newsletter.edit({show_post_title_section: false}, {id: defaultNewsletter.id});

            const {html, plaintext} = await sendEmail(agent, {
                title: 'This is a test post title',
                mobiledoc: mobileDocExample
            });

            // Check does not contain post title section
            const withoutTitleTag = html.replace(/<title>.*<\/title>/, '');
            assert.doesNotMatch(withoutTitleTag, /This is a test post title/);
            assert.doesNotMatch(plaintext, /This is a test post title/);
            await matchEmailSnapshot();

            // undo
            await models.Newsletter.edit({show_post_title_section: true}, {id: defaultNewsletter.id});

            // Check does contain post title section
            const {html: html2, plaintext: plaintext2} = await sendEmail(agent, {
                title: 'This is a test post title',
                mobiledoc: mobileDocExample
            });

            const withoutTitleTag2 = html2.replace(/<title>.*<\/title>/, '');
            assert.match(withoutTitleTag2, /This is a test post title/);
            assert.match(plaintext2, /This is a test post title/);
            await matchEmailSnapshot();
        });

        it('Shows 3 comment buttons for published posts without feedback enabled', async function () {
            mockSetting('comments_enabled', 'all');
            mockSetting('email_track_clicks', false); // Disable link replacement for this test

            const defaultNewsletter = await getDefaultNewsletter();
            assert(defaultNewsletter.get('show_comment_cta'), 'show_comment_cta should be true for this test');
            assert(!defaultNewsletter.get('feedback_enabled'), 'feedback_enabled should be off for this test');

            const {html} = await sendEmail(agent, {
                title: 'This is a test post title',
                mobiledoc: mobileDocExample
            });

            // Currently the link is not present in plaintext version (because no text)
            assert.equal(html.match(/#ghost-comments/g).length, 3, 'Every email should have 3 buttons to comments');
            await matchEmailSnapshot();
        });

        it('Shows 3 comment buttons for published posts with feedback enabled', async function () {
            mockSetting('comments_enabled', 'all');
            mockSetting('email_track_clicks', false); // Disable link replacement for this test

            const defaultNewsletter = await getDefaultNewsletter();
            assert(defaultNewsletter.get('show_comment_cta'), 'show_comment_cta should be true for this test');
            await models.Newsletter.edit({feedback_enabled: true}, {id: defaultNewsletter.id});

            try {
                const {html} = await sendEmail(agent, {
                    title: 'This is a test post title',
                    mobiledoc: mobileDocExample
                });

                // Currently the link is not present in plaintext version (because no text)
                assert.equal(html.match(/#ghost-comments/g).length, 3, 'Every email should have 3 buttons to comments');
                await matchEmailSnapshot();
            } finally {
                // undo
                await models.Newsletter.edit({feedback_enabled: false}, {id: defaultNewsletter.id});
            }
        });

        it('Hides comments button for email only posts', async function () {
            mockSetting('comments_enabled', 'all');
            mockSetting('email_track_clicks', false); // Disable link replacement for this test

            const defaultNewsletter = await getDefaultNewsletter();
            assert(defaultNewsletter.get('show_comment_cta'), 'show_comment_cta should be true for this test');

            const {html} = await sendEmail(agent, {
                title: 'This is a test post title',
                mobiledoc: mobileDocExample,
                email_only: true
            });

            // Check does not contain post title section
            assert.doesNotMatch(html, /#ghost-comments/);
            await matchEmailSnapshot();
        });

        it('Hides comments button if comments disabled', async function () {
            mockSetting('comments_enabled', 'off');
            mockSetting('email_track_clicks', false); // Disable link replacement for this test

            const defaultNewsletter = await getDefaultNewsletter();
            assert(defaultNewsletter.get('show_comment_cta'), 'show_comment_cta should be true for this test');

            const {html} = await sendEmail(agent, {
                title: 'This is a test post title',
                mobiledoc: mobileDocExample
            });

            assert.doesNotMatch(html, /#ghost-comments/);
            await matchEmailSnapshot();
        });

        it('Hides comments button if disabled in newsletter', async function () {
            mockSetting('comments_enabled', 'all');
            mockSetting('email_track_clicks', false); // Disable link replacement for this test

            const defaultNewsletter = await getDefaultNewsletter();
            await models.Newsletter.edit({show_comment_cta: false}, {id: defaultNewsletter.id});

            const {html} = await sendEmail(agent, {
                title: 'This is a test post title',
                mobiledoc: mobileDocExample
            });

            assert.doesNotMatch(html, /#ghost-comments/);
            await matchEmailSnapshot();

            // undo
            await models.Newsletter.edit({show_comment_cta: true}, {id: defaultNewsletter.id});
        });

        it('Shows subscription details box for free members', async function () {
            this.retries(1);
            // Create a new member without a first_name
            await models.Member.add({
                email: 'subscription-box-1@example.com',
                labels: [{name: 'subscription-box-tests'}],
                newsletters: [{
                    id: fixtureManager.get('newsletters', 0).id
                }],
                email_disabled: false
            });

            mockSetting('email_track_clicks', false); // Disable link replacement for this test

            const defaultNewsletter = await getDefaultNewsletter();
            await models.Newsletter.edit({show_subscription_details: true}, {id: defaultNewsletter.id});

            const {html, plaintext} = await sendEmail(agent, {
                title: 'This is a test post title',
                mobiledoc: mobileDocExample
            }, 'label:subscription-box-tests');

            // Currently the link is not present in plaintext version (because no text)
            assert.equal(html.match(/#\/portal\/account/g).length, 1, 'Subscription details box should contain a link to the account page');

            // Check text matches
            assert.match(plaintext, /You are receiving this because you are a free subscriber to Ghost\./);

            await matchEmailSnapshot();

            // undo
            await models.Newsletter.edit({show_subscription_details: false}, {id: defaultNewsletter.id});
        });

        it('Shows subscription details box for comped members', async function () {
            // Create a new member without a first_name
            await models.Member.add({
                email: 'subscription-box-comped@example.com',
                labels: [{name: 'subscription-box-comped-tests'}],
                newsletters: [{
                    id: fixtureManager.get('newsletters', 0).id
                }],
                status: 'comped',
                email_disabled: false
            });

            mockSetting('email_track_clicks', false); // Disable link replacement for this test

            const defaultNewsletter = await getDefaultNewsletter();
            await models.Newsletter.edit({show_subscription_details: true}, {id: defaultNewsletter.id});

            const {html, plaintext} = await sendEmail(agent, {
                title: 'This is a test post title',
                mobiledoc: mobileDocExample
            }, 'label:subscription-box-comped-tests');

            // Currently the link is not present in plaintext version (because no text)
            assert.equal(html.match(/#\/portal\/account/g).length, 1, 'Subscription details box should contain a link to the account page');

            // Check text matches
            assert.match(plaintext, /You are receiving this because you are a complimentary subscriber to Ghost\./);

            await matchEmailSnapshot();

            // undo
            await models.Newsletter.edit({show_subscription_details: false}, {id: defaultNewsletter.id});
        });

        it('Shows subscription details box for trialing member', async function () {
            mockSetting('email_track_clicks', false); // Disable link replacement for this test

            // Create a new member without a first_name
            const customer = stripeMocker.createCustomer({
                email: 'trialing-paid@example.com'
            });
            const price = await stripeMocker.getPriceForTier('default-product', 'month');
            await stripeMocker.createTrialSubscription({
                customer,
                price
            });

            const member = await models.Member.findOne({email: customer.email}, {require: true});
            await models.Member.edit({
                labels: [{name: 'subscription-box-trialing-tests'}],
                newsletters: [{
                    id: fixtureManager.get('newsletters', 0).id
                }]
            }, {id: member.id});

            const defaultNewsletter = await getDefaultNewsletter();
            await models.Newsletter.edit({show_subscription_details: true}, {id: defaultNewsletter.id});

            const {html, plaintext} = await sendEmail(agent, {
                title: 'This is a test post title',
                mobiledoc: mobileDocExample
            }, 'label:subscription-box-trialing-tests');

            // Currently the link is not present in plaintext version (because no text)
            assert.equal(html.match(/#\/portal\/account/g).length, 1, 'Subscription details box should contain a link to the account page');

            // Check text matches
            assert.match(plaintext, /You are receiving this because you are a trialing subscriber to Ghost\. Your free trial ends on \d+ \w+ \d+, at which time you will be charged the regular price\. You can always cancel before then\./);

            await matchEmailSnapshot();

            // undo
            await models.Newsletter.edit({show_subscription_details: false}, {id: defaultNewsletter.id});
        });

        it('Shows subscription details box for paid member', async function () {
            mockSetting('email_track_clicks', false); // Disable link replacement for this test

            // Create a new member without a first_name
            const customer = stripeMocker.createCustomer({
                email: 'paid@example.com'
            });
            const price = await stripeMocker.getPriceForTier('default-product', 'month');
            await stripeMocker.createSubscription({
                customer,
                price
            });

            const member = await models.Member.findOne({email: customer.email}, {require: true});
            await models.Member.edit({
                labels: [{name: 'subscription-box-paid-tests'}],
                newsletters: [{
                    id: fixtureManager.get('newsletters', 0).id
                }]
            }, {id: member.id});

            const defaultNewsletter = await getDefaultNewsletter();
            await models.Newsletter.edit({show_subscription_details: true}, {id: defaultNewsletter.id});

            const {html, plaintext} = await sendEmail(agent, {
                title: 'This is a test post title',
                mobiledoc: mobileDocExample
            }, 'label:subscription-box-paid-tests');

            // Currently the link is not present in plaintext version (because no text)
            assert.equal(html.match(/#\/portal\/account/g).length, 1, 'Subscription details box should contain a link to the account page');

            // Check text matches
            assert.match(plaintext, /You are receiving this because you are a paid subscriber to Ghost\. Your subscription will renew on \d+ \w+ \d+\./);

            await matchEmailSnapshot();

            // undo
            await models.Newsletter.edit({show_subscription_details: false}, {id: defaultNewsletter.id});
        });

        it('Shows subscription details box for canceled paid member', async function () {
            mockSetting('email_track_clicks', false); // Disable link replacement for this test

            // Create a new member without a first_name
            const customer = stripeMocker.createCustomer({
                email: 'canceled-paid@example.com'
            });
            const price = await stripeMocker.getPriceForTier('default-product', 'month');
            await stripeMocker.createSubscription({
                customer,
                price,
                cancel_at_period_end: true
            });

            const member = await models.Member.findOne({email: customer.email}, {require: true});
            await models.Member.edit({
                labels: [{name: 'subscription-box-canceled-tests'}],
                newsletters: [{
                    id: fixtureManager.get('newsletters', 0).id
                }]
            }, {id: member.id});

            const defaultNewsletter = await getDefaultNewsletter();
            await models.Newsletter.edit({show_subscription_details: true}, {id: defaultNewsletter.id});

            const {html, plaintext} = await sendEmail(agent, {
                title: 'This is a test post title',
                mobiledoc: mobileDocExample
            }, 'label:subscription-box-canceled-tests');

            // Currently the link is not present in plaintext version (because no text)
            assert.equal(html.match(/#\/portal\/account/g).length, 1, 'Subscription details box should contain a link to the account page');

            // Check text matches
            assert.match(plaintext, /You are receiving this because you are a paid subscriber to Ghost\. Your subscription has been canceled and will expire on \d+ \w+ \d+\. You can resume your subscription via your account settings\./);

            await matchEmailSnapshot();

            // undo
            await models.Newsletter.edit({show_subscription_details: false}, {id: defaultNewsletter.id});
        });

        it('Shows 3 latest posts', async function () {
            const defaultNewsletter = await getDefaultNewsletter();
            await models.Newsletter.edit({show_latest_posts: true}, {id: defaultNewsletter.id});

            const {html} = await sendEmail(agent, {
                title: 'This is the main post title',
                mobiledoc: mobileDocExample
            });

            // Check contains 3 latest posts
            assert.match(html, /Keep reading/);

            // Check count of title
            assert.equal(html.match(/This is the main post title/g).length, 2, 'Should only contain the title two times'); // otherwise post is in last 3 posts

            await matchEmailSnapshot();

            // undo
            await models.Newsletter.edit({show_latest_posts: false}, {id: defaultNewsletter.id});
        });
    });
});
