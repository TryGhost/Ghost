const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const testUtils = require('../../../utils');
const moment = require('moment');
const ObjectId = require('bson-objectid');
const {_sendEmailJob} = require('../../../../core/server/services/mega/mega');
const models = require('../../../../core/server/models');
const sinon = require('sinon');
const mailgunProvider = require('../../../../core/server/services/bulk-email/mailgun');
require('should');

let agent;

async function createPublishedPostEmail() {
    const post = {
        title: 'A random test post',
        status: 'draft',
        feature_image_alt: 'Testing sending',
        feature_image_caption: 'Testing <b>feature image caption</b>',
        mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
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

    const newsletterId = testUtils.DataGenerator.Content.newsletters[1].id;
    await agent.put(`posts/${id}/?email_recipient_filter=all&newsletter_id=${newsletterId}`)
        .body({posts: [updatedPost]})
        .expectStatus(200);

    const emailModel = await models.Email.findOne({
        post_id: id
    }, testUtils.context.internal);
    should.exist(emailModel);

    return emailModel;
}

describe('MEGA', function () {
    describe('sendEmailJob', function () {
        before(async function () {
            agent = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init('newsletters', 'members:newsletters');
            await agent.loginAsOwner();
        });

        afterEach(function () {
            mockManager.restore();
        });
        
        it('Can send a scheduled post email', async function () {
            sinon.stub(mailgunProvider, 'getInstance').returns({});
            sinon.stub(mailgunProvider, 'send').callsFake(async () => {
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
            sinon.stub(mailgunProvider, 'getInstance').returns({});
            sinon.stub(mailgunProvider, 'send').callsFake(async () => {
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
});
