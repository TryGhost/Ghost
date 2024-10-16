const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyISODate, anyISODateTime, anyContentLength, anyContentVersion, stringMatching, anyNumber} = matchers;

describe('Explore API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'members');
        await agent.loginAsOwner();
    });

    describe('Read', function () {
        it('Can request Explore data', async function () {
            await agent
                .get('explore/')
                .expectStatus(200)
                .matchBodySnapshot({
                    explore: {
                        most_recently_published_at: anyISODateTime,
                        total_posts_published: anyNumber,
                        mrr_stats: {
                            data: [{
                                date: anyISODate
                            },
                            {
                                date: anyISODate
                            }]
                        },
                        version: stringMatching(/\d+\.\d+\.\d+/)
                    }
                })
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    // Special rule for this test, as the labs setting changes a lot
                    'content-length': anyContentLength,
                    'content-version': anyContentVersion
                });
        });
    });
});
