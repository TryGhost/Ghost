const sinon = require('sinon');

const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const jobManager = require('../../../../core/server/services/jobs/job-service');
const EmailSegmenter = require('../../../../core/server/services/email-service/email-segmenter');

describe('Email recipient count', function () {
    let agent;
    let ghostServer;

    beforeAll(async function () {
        const agents = await agentProvider.getAgentsWithFrontend();
        agent = agents.adminAgent;
        ghostServer = agents.ghostServer;

        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockMail();
        mockManager.mockStripe();
        sinon.stub(jobManager, 'addJob');
    });

    afterEach(function () {
        sinon.restore();
        mockManager.restore();
    });

    afterAll(async function () {
        mockManager.restore();
        await ghostServer.stop();
    });

    it('counts recipients once when publishing a newsletter post', async function () {
        const {body} = await agent.post('posts/')
            .body({
                posts: [{
                    title: `Recipient count test ${Date.now()}`,
                    status: 'draft'
                }]
            })
            .expectStatus(201);
        const post = body.posts[0];
        const newsletterSlug = fixtureManager.get('newsletters', 0).slug;
        const getMembersCount = sinon.spy(EmailSegmenter.prototype, 'getMembersCount');

        await agent.put(`posts/${post.id}/?newsletter=${newsletterSlug}`)
            .body({
                posts: [{
                    status: 'published',
                    updated_at: post.updated_at
                }]
            })
            .expectStatus(200);

        sinon.assert.calledOnce(getMembersCount);
    });
});
