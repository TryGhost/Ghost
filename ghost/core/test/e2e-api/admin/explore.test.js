const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyISODate, anyISODateTime, stringMatching} = matchers;

describe('Explore API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    describe('Read', function () {
        it('Can request Explore data', async function () {
            await agent
                .get('explore/')
                .expectStatus(200)
                .matchBodySnapshot({
                    explore: {
                        mostRecentlyPublishedAt: anyISODateTime,
                        mrrStats: {
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
                    etag: anyEtag
                });
        });
    });
});
