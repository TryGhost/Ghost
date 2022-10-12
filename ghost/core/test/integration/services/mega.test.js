require('should');
const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const moment = require('moment');
const ObjectId = require('bson-objectid').default;
const models = require('../../../core/server/models');
const sinon = require('sinon');
const assert = require('assert');
let agent;

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function createPublishedPostEmail() {
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
        .expectStatus(200);

    const emailModel = await models.Email.findOne({
        post_id: id
    });
    should.exist(emailModel);

    return emailModel;
}

describe('MEGA', function () {
    let _sendEmailJob;
    let _mailgunClient;
    let frontendAgent;

    describe('sendEmailJob', function () {
        before(async function () {
            agent = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init('newsletters', 'members:newsletters');
            await agent.loginAsOwner();
            _sendEmailJob = require('../../../core/server/services/mega/mega')._sendEmailJob;
            _mailgunClient = require('../../../core/server/services/bulk-email')._mailgunClient;
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('Can send a scheduled post email', async function () {
            sinon.stub(_mailgunClient, 'getInstance').returns({});
            sinon.stub(_mailgunClient, 'send').callsFake(async () => {
                return {
                    id: 'stubbed-email-id'
                };
            });

            // Prepare a post and email model
            const emailModel = await createPublishedPostEmail();

            // Launch email job
            await _sendEmailJob({emailModel, options: {}});

            await emailModel.refresh();
            emailModel.get('status').should.eql('submitted');
        });

        it('Can handle a failed post email', async function () {
            sinon.stub(_mailgunClient, 'getInstance').returns({});
            sinon.stub(_mailgunClient, 'send').callsFake(async () => {
                throw new Error('Failed to send');
            });

            // Prepare a post and email model
            const emailModel = await createPublishedPostEmail();

            // Launch email job
            await _sendEmailJob({emailModel, options: {}});

            await emailModel.refresh();
            emailModel.get('status').should.eql('failed');
        });
    });

    /**
     * This is one full E2E test that tests if the tracked links are valid and are working.
     * More detailed tests don't have to cover the whole flow. But this test is useful because it also tests if the member uuids are correctly added in every link
     * + it tests if all the pieces glue together correctly
     */
    describe('Link click tracking', function () {
        before(async function () {
            const agents = await agentProvider.getAgentsWithFrontend();
            agent = agents.adminAgent;
            frontendAgent = agents.frontendAgent;

            await fixtureManager.init('newsletters', 'members:newsletters');
            await agent.loginAsOwner();
            _sendEmailJob = require('../../../core/server/services/mega/mega')._sendEmailJob;
            _mailgunClient = require('../../../core/server/services/bulk-email')._mailgunClient;
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('Tracks all the links in an email', async function () {
            const linkRedirectService = require('../../../core/server/services/link-redirection');
            const linkRedirectRepository = linkRedirectService.linkRedirectRepository;

            const linkTrackingService = require('../../../core/server/services/link-tracking');
            const linkClickRepository = linkTrackingService.linkClickRepository;

            sinon.stub(_mailgunClient, 'getInstance').returns({});
            const sendStub = sinon.stub(_mailgunClient, 'send');

            sendStub.callsFake(async () => {
                return {
                    id: 'stubbed-email-id'
                };
            });

            // Prepare a post and email model
            const emailModel = await createPublishedPostEmail();

            // Launch email job
            await _sendEmailJob({emailModel, options: {}});

            await emailModel.refresh();
            emailModel.get('status').should.eql('submitted');

            // Get email data (first argument to sendStub call)
            const emailData = sendStub.args[0][0];
            const recipientData = sendStub.args[0][1];
            const replacements = sendStub.args[0][2];

            const recipient = recipientData[Object.keys(recipientData)[0]];

            // Do the actual replacements for the first member, so we don't have to worry about them anymore
            replacements.forEach((replacement) => {
                emailData[replacement.format] = emailData[replacement.format].replace(
                    replacement.match,
                    recipient[replacement.id]
                );

                // Also force Mailgun format
                emailData[replacement.format] = emailData[replacement.format].replace(
                    `%recipient.${replacement.id}%`,
                    recipient[replacement.id]
                );
            });

            const html = emailData.html;

            const memberUuid = recipient.unique_id;

            // Test if all links are replaced and contain the member id
            const cheerio = require('cheerio');
            const $ = cheerio.load(html);

            const exclude = '%recipient.unsubscribe_url%';
            let firstLink;
    
            for (const el of $('a').toArray()) {
                const href = $(el).attr('href');

                if (href === exclude) {
                    continue;
                }

                // Check if the link is a tracked link
                assert(href.includes('?m=' + memberUuid), href + ' is not tracked');

                if (!firstLink) {
                    firstLink = new URL(href);
                }
            }

            const links = await linkRedirectRepository.getAll({post_id: emailModel.get('post_id')});
            const link = links.find(l => l.from.pathname === firstLink.pathname);
            assert(link, 'Link model not created');

            // Mimic a click on a link
            const path = firstLink.pathname + firstLink.search;
            await frontendAgent.get(path)
                .expect('Location', link.to.href)
                .expect(302);

            // Since this is all event based, we need to wait a coulple of ms
            // in the future we should wait for all dispatched events to be completed.
            await sleep(200);

            // Check if click was tracked and associated with the correct member
            const member = await models.Member.findOne({uuid: memberUuid});
            const clickEvent = await linkClickRepository.getAll({member_id: member.id, link_id: link.link_id.toHexString()});
            assert(clickEvent.length === 1, 'Click event was not tracked');
        });
    });
});
