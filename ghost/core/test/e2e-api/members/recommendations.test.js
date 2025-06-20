const assert = require('assert/strict');
const {agentProvider, mockManager, fixtureManager, matchers, configUtils} = require('../../utils/e2e-framework');
const {anyEtag} = matchers;
const recommendationsService = require('../../../core/server/services/recommendations');
const {Recommendation} = require('../../../core/server/services/recommendations/service');

async function testClicked({recommendationId, memberId}, test) {
    const before = await recommendationsService.clickEventRepository.getAll({
        filter: `recommendationId:'${recommendationId}'`
    });

    await test();

    const after = await recommendationsService.clickEventRepository.getAll({
        filter: `recommendationId:'${recommendationId}'`
    });

    assert.equal(after.length, before.length + 1);

    // Check member is set
    const added = after.find(event => !before.find(e => e.id === event.id));
    assert.equal(added.memberId, memberId);
}

async function testNotClicked(test) {
    const before = await recommendationsService.clickEventRepository.getCount();
    await test();
    const after = await recommendationsService.clickEventRepository.getCount();

    assert.equal(after, before);
}

async function testNotSubscribed(test) {
    const before = await recommendationsService.subscribeEventRepository.getCount();
    await test();
    const after = await recommendationsService.subscribeEventRepository.getCount();

    assert.equal(after, before);
}

async function testSubscribed({recommendationId, memberId}, test) {
    const before = await recommendationsService.subscribeEventRepository.getAll({
        filter: `recommendationId:'${recommendationId}'`
    });
    await test();
    const after = await recommendationsService.subscribeEventRepository.getAll({
        filter: `recommendationId:'${recommendationId}'`
    });

    assert.equal(after.length, before.length + 1);

    // Check member is set
    const added = after.find(event => !before.find(e => e.id === event.id));
    assert.equal(added.memberId, memberId);
}

describe('Recommendation Event Tracking', function () {
    let membersAgent, membersAgent2, memberId;
    let recommendationId;
    let clock;

    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();
        membersAgent2 = membersAgent.duplicate();
        await membersAgent2.loginAs('authenticationtest@email.com');
        await fixtureManager.init('posts', 'members');

        const membersService = require('../../../core/server/services/members');
        const memberRepository = membersService.api.members;

        const member = await memberRepository.get({email: 'authenticationtest@email.com'});
        memberId = member.id;

        // Add recommendation
        const recommendation = Recommendation.create({
            title: `Recommendation`,
            description: `Description`,
            url: new URL(`https://recommendation.com`),
            favicon: null,
            featuredImage: null,
            excerpt: null,
            oneClickSubscribe: false
        });

        await recommendationsService.repository.save(recommendation);
        recommendationId = recommendation.id;
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(async function () {
        clock?.restore();
        clock = undefined;
        await configUtils.restore();
        mockManager.restore();
    });

    describe('Authenticated', function () {
        it('Can track subscribe clicks', async function () {
            await testNotClicked(async () => {
                await testSubscribed({recommendationId, memberId}, async () => {
                    await membersAgent2
                        .post('/api/recommendations/' + recommendationId + '/subscribed/')
                        .body({})
                        .expectStatus(204)
                        .matchHeaderSnapshot({
                            etag: anyEtag
                        })
                        .expectEmptyBody();
                });
            });
        });

        it('Can track clicks', async function () {
            await testNotSubscribed(async () => {
                await testClicked({recommendationId, memberId}, async () => {
                    await membersAgent2
                        .post('/api/recommendations/' + recommendationId + '/clicked/')
                        .body({})
                        .expectStatus(204)
                        .matchHeaderSnapshot({
                            etag: anyEtag
                        })
                        .expectEmptyBody();
                });
            });
        });
    });

    describe('Unauthenticated', function () {
        it('Can not track subscribe clicks', async function () {
            await testNotClicked(async () => {
                await testNotSubscribed(async () => {
                    await membersAgent
                        .post('/api/recommendations/' + recommendationId + '/subscribed/')
                        .body({})
                        .expectStatus(401)
                        .matchHeaderSnapshot({
                            etag: anyEtag
                        });
                });
            });
        });

        it('Can track clicks', async function () {
            await testNotSubscribed(async () => {
                await testClicked({recommendationId, memberId: null}, async () => {
                    await membersAgent
                        .post('/api/recommendations/' + recommendationId + '/clicked/')
                        .body({})
                        .expectStatus(204)
                        .matchHeaderSnapshot({
                            etag: anyEtag
                        })
                        .expectEmptyBody();
                });
            });
        });
    });
});
