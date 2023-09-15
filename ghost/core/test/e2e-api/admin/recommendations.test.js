const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {anyObjectId, anyErrorId, anyISODateTime, anyContentVersion, anyLocationFor, anyEtag} = matchers;
const assert = require('assert/strict');
const recommendationsService = require('../../../core/server/services/recommendations');
const {Recommendation} = require('@tryghost/recommendations');

async function addDummyRecommendation(agent) {
    await agent.post('recommendations/').body({
        recommendations: [{
            title: 'Dog Pictures',
            url: 'https://dogpictures.com'
        }]
    });
    const id = (await recommendationsService.repository.getAll())[0].id;
    return id;
}

describe('Recommendations Admin API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts');
        await agent.loginAsOwner();
    });

    afterEach(async function () {
        for (const recommendation of (await recommendationsService.repository.getAll())) {
            recommendation.delete();
            await recommendationsService.repository.save(recommendation);
        }

        mockManager.restore();
    });

    it('Can add a minimal recommendation', async function () {
        const {body} = await agent.post('recommendations/')
            .body({
                recommendations: [{
                    title: 'Dog Pictures',
                    url: 'https://dogpictures.com'
                }]
            })
            .expectStatus(201)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('recommendations')
            })
            .matchBodySnapshot({
                recommendations: [
                    {
                        id: anyObjectId,
                        created_at: anyISODateTime
                    }
                ]
            });

        // Check everything is set correctly
        assert.equal(body.recommendations[0].title, 'Dog Pictures');
        assert.equal(body.recommendations[0].url, 'https://dogpictures.com/');
        assert.equal(body.recommendations[0].reason, null);
        assert.equal(body.recommendations[0].excerpt, null);
        assert.equal(body.recommendations[0].featured_image, null);
        assert.equal(body.recommendations[0].favicon, null);
        assert.equal(body.recommendations[0].one_click_subscribe, false);
    });

    it('Can add a full recommendation', async function () {
        const {body} = await agent.post('recommendations/')
            .body({
                recommendations: [{
                    title: 'Dog Pictures',
                    url: 'https://dogpictures.com',
                    reason: 'Because dogs are cute',
                    excerpt: 'Dogs are cute',
                    featured_image: 'https://dogpictures.com/dog.jpg',
                    favicon: 'https://dogpictures.com/favicon.ico',
                    one_click_subscribe: true
                }]
            })
            .expectStatus(201)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('recommendations')
            })
            .matchBodySnapshot({
                recommendations: [
                    {
                        id: anyObjectId,
                        created_at: anyISODateTime
                    }
                ]
            });

        // Check everything is set correctly
        assert.equal(body.recommendations[0].title, 'Dog Pictures');
        assert.equal(body.recommendations[0].url, 'https://dogpictures.com/');
        assert.equal(body.recommendations[0].reason, 'Because dogs are cute');
        assert.equal(body.recommendations[0].excerpt, 'Dogs are cute');
        assert.equal(body.recommendations[0].featured_image, 'https://dogpictures.com/dog.jpg');
        assert.equal(body.recommendations[0].favicon, 'https://dogpictures.com/favicon.ico');
        assert.equal(body.recommendations[0].one_click_subscribe, true);
    });

    it('Cannot add the same recommendation twice', async function () {
        await agent.post('recommendations/')
            .body({
                recommendations: [{
                    title: 'Dog Pictures',
                    url: 'https://dogpictures.com'
                }]
            });

        await agent.post('recommendations/')
            .body({
                recommendations: [{
                    title: 'Dog Pictures 2',
                    url: 'https://dogpictures.com'
                }]
            })
            .expectStatus(422);
    });

    it('Can edit recommendation', async function () {
        const id = await addDummyRecommendation(agent);
        const {body} = await agent.put(`recommendations/${id}/`)
            .body({
                recommendations: [{
                    title: 'Cat Pictures',
                    url: 'https://dogpictures.com',
                    reason: 'Because cats are cute',
                    excerpt: 'Cats are cute',
                    featured_image: 'https://catpictures.com/cat.jpg',
                    favicon: 'https://catpictures.com/favicon.ico',
                    one_click_subscribe: false
                }]
            })
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                recommendations: [
                    {
                        id: anyObjectId,
                        created_at: anyISODateTime,
                        updated_at: anyISODateTime
                    }
                ]
            });

        // Check everything is set correctly
        assert.equal(body.recommendations[0].id, id);
        assert.equal(body.recommendations[0].title, 'Cat Pictures');
        assert.equal(body.recommendations[0].url, 'https://dogpictures.com/');
        assert.equal(body.recommendations[0].reason, 'Because cats are cute');
        assert.equal(body.recommendations[0].excerpt, 'Cats are cute');
        assert.equal(body.recommendations[0].featured_image, 'https://catpictures.com/cat.jpg');
        assert.equal(body.recommendations[0].favicon, 'https://catpictures.com/favicon.ico');
        assert.equal(body.recommendations[0].one_click_subscribe, false);
    });

    it('Cannot use invalid protocols when editing', async function () {
        const id = await addDummyRecommendation(agent);

        await agent.put(`recommendations/${id}/`)
            .body({
                recommendations: [{
                    title: 'Cat Pictures',
                    url: 'https://dogpictures.com',
                    reason: 'Because cats are cute',
                    excerpt: 'Cats are cute',
                    featured_image: 'ftp://dogpictures.com/dog.jpg',
                    favicon: 'ftp://dogpictures.com/favicon.ico',
                    one_click_subscribe: false
                }]
            })
            .expectStatus(422)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [
                    {
                        id: anyErrorId
                    }
                ]
            });
    });

    it('Can delete recommendation', async function () {
        const id = await addDummyRecommendation(agent);
        await agent.delete(`recommendations/${id}/`)
            .expectStatus(204)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({});
    });

    it('Can browse', async function () {
        await addDummyRecommendation(agent);

        await agent.get('recommendations/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                recommendations: [
                    {
                        id: anyObjectId,
                        created_at: anyISODateTime,
                        updated_at: anyISODateTime
                    }
                ]
            });
    });

    it('Can request pages', async function () {
        // Add 15 recommendations using the repository
        for (let i = 0; i < 15; i++) {
            const recommendation = Recommendation.create({
                title: `Recommendation ${i}`,
                reason: `Reason ${i}`,
                url: new URL(`https://recommendation${i}.com`),
                favicon: null,
                featuredImage: null,
                excerpt: null,
                oneClickSubscribe: false,
                createdAt: new Date(i * 5000) // Reliable ordering
            });

            await recommendationsService.repository.save(recommendation);
        }

        const {body: page1} = await agent.get('recommendations/?page=1&limit=10')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                recommendations: new Array(10).fill({
                    id: anyObjectId,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime
                })
            });

        assert.equal(page1.meta.pagination.page, 1);
        assert.equal(page1.meta.pagination.limit, 10);
        assert.equal(page1.meta.pagination.pages, 2);
        assert.equal(page1.meta.pagination.next, 2);
        assert.equal(page1.meta.pagination.prev, null);
        assert.equal(page1.meta.pagination.total, 15);

        const {body: page2} = await agent.get('recommendations/?page=2&limit=10')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                recommendations: new Array(5).fill({
                    id: anyObjectId,
                    created_at: anyISODateTime,
                    updated_at: anyISODateTime
                })
            });

        assert.equal(page2.meta.pagination.page, 2);
        assert.equal(page2.meta.pagination.limit, 10);
        assert.equal(page2.meta.pagination.pages, 2);
        assert.equal(page2.meta.pagination.next, null);
        assert.equal(page2.meta.pagination.prev, 1);
        assert.equal(page2.meta.pagination.total, 15);
    });

    it('Uses default limit of 5', async function () {
        const {body: page1} = await agent.get('recommendations/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        assert.equal(page1.meta.pagination.limit, 5);
    });
});
