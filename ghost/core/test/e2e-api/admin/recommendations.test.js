const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {anyObjectId, anyErrorId, anyISODateTime, anyContentVersion, anyLocationFor, anyEtag} = matchers;
const assert = require('assert/strict');
const recommendationsService = require('../../../core/server/services/recommendations');
const {Recommendation, ClickEvent, SubscribeEvent} = require('../../../core/server/services/recommendations/service');
const nock = require('nock');

async function addDummyRecommendation(i = 0) {
    const recommendation = Recommendation.create({
        title: `Recommendation ${i}`,
        description: `Description ${i}`,
        url: new URL(`https://recommendation${i}.com`),
        favicon: new URL(`https://recommendation${i}.com/favicon.ico`),
        featuredImage: new URL(`https://recommendation${i}.com/featured.jpg`),
        excerpt: 'Test excerpt',
        oneClickSubscribe: true,
        createdAt: new Date(i * 5000) // Reliable ordering
    });

    await recommendationsService.repository.save(recommendation);
    return recommendation.id;
}

async function addDummyRecommendations(amount = 15) {
    // Add 15 recommendations using the repository
    for (let i = 0; i < amount; i++) {
        await addDummyRecommendation(i);
    }
}

async function addClicksAndSubscribers({memberId}) {
    const recommendations = await recommendationsService.repository.getAll({order: [{field: 'createdAt', direction: 'desc'}]});

    // Create 2 clicks for 1st
    for (let i = 0; i < 2; i++) {
        const clickEvent = ClickEvent.create({
            recommendationId: recommendations[0].id
        });

        await recommendationsService.clickEventRepository.save(clickEvent);
    }

    // Create 3 clicks for 2nd
    for (let i = 0; i < 3; i++) {
        const clickEvent = ClickEvent.create({
            recommendationId: recommendations[1].id
        });

        await recommendationsService.clickEventRepository.save(clickEvent);
    }

    // Create 3 subscribers for 1st
    for (let i = 0; i < 3; i++) {
        const subscribeEvent = SubscribeEvent.create({
            recommendationId: recommendations[0].id,
            memberId
        });

        await recommendationsService.subscribeEventRepository.save(subscribeEvent);
    }

    // Create 2 subscribers for 3rd
    for (let i = 0; i < 2; i++) {
        const subscribeEvent = SubscribeEvent.create({
            recommendationId: recommendations[2].id,
            memberId
        });

        await recommendationsService.subscribeEventRepository.save(subscribeEvent);
    }
}

describe('Recommendations Admin API', function () {
    let agent, memberId;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'members');
        await agent.loginAsOwner();

        memberId = fixtureManager.get('members', 0).id;
    });

    afterEach(async function () {
        for (const recommendation of (await recommendationsService.repository.getAll())) {
            recommendation.delete();
            await recommendationsService.repository.save(recommendation);
        }
        mockManager.restore();
    });

    describe('browse', function () {
        it('Can browse', async function () {
            await addDummyRecommendation();

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
            await addDummyRecommendations(15);

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
            await addDummyRecommendations(6);
            const {body: page1} = await agent.get('recommendations/')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            assert.equal(page1.meta.pagination.limit, 5);
        });

        it('Can include click and subscribe counts', async function () {
            await addDummyRecommendations(5);
            await addClicksAndSubscribers({memberId});

            const {body: page1} = await agent.get('recommendations/?include=count.clicks,count.subscribers')
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

            assert.equal(page1.recommendations[0].count.clicks, 2);
            assert.equal(page1.recommendations[1].count.clicks, 3);

            assert.equal(page1.recommendations[0].count.subscribers, 3);
            assert.equal(page1.recommendations[1].count.subscribers, 0);
            assert.equal(page1.recommendations[2].count.subscribers, 2);
        });

        it('Can include only clicks', async function () {
            await addDummyRecommendations(5);
            await addClicksAndSubscribers({memberId});

            const {body: page1} = await agent.get('recommendations/?include=count.clicks')
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

            assert.equal(page1.recommendations[0].count.clicks, 2);
            assert.equal(page1.recommendations[1].count.clicks, 3);

            assert.equal(page1.recommendations[0].count.subscribers, undefined);
            assert.equal(page1.recommendations[1].count.subscribers, undefined);
            assert.equal(page1.recommendations[2].count.subscribers, undefined);
        });

        it('Can include only subscribers', async function () {
            await addDummyRecommendations(5);
            await addClicksAndSubscribers({memberId});

            const {body: page1} = await agent.get('recommendations/?include=count.subscribers')
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

            assert.equal(page1.recommendations[0].count.clicks, undefined);
            assert.equal(page1.recommendations[1].count.clicks, undefined);

            assert.equal(page1.recommendations[0].count.subscribers, 3);
            assert.equal(page1.recommendations[1].count.subscribers, 0);
            assert.equal(page1.recommendations[2].count.subscribers, 2);
        });

        it('Can include click and subscribe counts and order by clicks+subscribe count', async function () {
            await addDummyRecommendations(5);
            await addClicksAndSubscribers({memberId});

            const {body: page1} = await agent.get('recommendations/?include=count.clicks,count.subscribers&order=' + encodeURIComponent('count.clicks desc, count.subscribers asc'))
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

            assert.equal(page1.recommendations[0].count.clicks, 3);
            assert.equal(page1.recommendations[1].count.clicks, 2);

            assert.equal(page1.recommendations[0].count.subscribers, 0);
            assert.equal(page1.recommendations[1].count.subscribers, 3);
            assert.equal(page1.recommendations[2].count.subscribers, 0);
        });

        it('Can order by click and subscribe counts and they will be included by default', async function () {
            await addDummyRecommendations(5);
            await addClicksAndSubscribers({memberId});

            const {body: page1} = await agent.get('recommendations/?order=' + encodeURIComponent('count.clicks desc, count.subscribers asc'))
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

            assert.equal(page1.recommendations[0].count.clicks, 3);
            assert.equal(page1.recommendations[1].count.clicks, 2);

            assert.equal(page1.recommendations[0].count.subscribers, 0);
            assert.equal(page1.recommendations[1].count.subscribers, 3);
            assert.equal(page1.recommendations[2].count.subscribers, 0);
        });

        it('Can fetch recommendations with relations when there are no recommendations', async function () {
            const recommendations = await recommendationsService.repository.getCount();
            assert.equal(recommendations, 0, 'This test expects there to be no recommendations');

            const {body: page1} = await agent.get('recommendations/?include=count.clicks,count.subscribers')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({});

            assert.equal(page1.recommendations.length, 0);
        });

        it('can fetch recommendations filtered by an exact title', async function () {
            await addDummyRecommendations(5);

            const {body} = await agent.get(`recommendations/?filter=title:'Recommendation 1'`)
                .expectStatus(200);

            assert.equal(body.recommendations.length, 1);
            assert.equal(body.recommendations[0].title, 'Recommendation 1');
        });

        it('can fetch recommendations filtered by a partial URL', async function () {
            await addDummyRecommendations(5);

            const {body} = await agent.get(`recommendations/?filter=url:~'recommendation1.com'`)
                .expectStatus(200);

            assert.equal(body.recommendations.length, 1);
            assert.equal(body.recommendations[0].url, 'https://recommendation1.com/');
        });
    });

    describe('read', function () {
        it('can get a recommendation by ID', async function () {
            const id = await addDummyRecommendation(1);
            const {body} = await agent.get(`recommendations/${id}/`)
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

            // Check data
            assert.equal(body.recommendations[0].id, id);
            assert.equal(body.recommendations[0].title, 'Recommendation 1');
            assert.equal(body.recommendations[0].url, 'https://recommendation1.com/');
            assert.equal(body.recommendations[0].description, 'Description 1');
            assert.equal(body.recommendations[0].excerpt, 'Test excerpt');
            assert.equal(body.recommendations[0].featured_image, 'https://recommendation1.com/featured.jpg');
            assert.equal(body.recommendations[0].favicon, 'https://recommendation1.com/favicon.ico');
            assert.equal(body.recommendations[0].one_click_subscribe, true);
        });

        it('returns an empty array when the recommendation is not found', async function () {
            const id = 'i-dont-exist';
            const {body} = await agent.get(`recommendations/${id}/`)
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

            assert.equal(body.errors[0].type, 'ValidationError');
            assert.equal(body.errors[0].message, 'Validation error, cannot read recommendation.');
        });
    });

    describe('edit', function () {
        it('Can edit recommendation', async function () {
            const id = await addDummyRecommendation();
            const {body} = await agent.put(`recommendations/${id}/`)
                .body({
                    recommendations: [{
                        title: 'Cat Pictures',
                        url: 'https://dogpictures.com',
                        description: 'Because cats are cute',
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
            assert.equal(body.recommendations[0].description, 'Because cats are cute');
            assert.equal(body.recommendations[0].excerpt, 'Cats are cute');
            assert.equal(body.recommendations[0].featured_image, 'https://catpictures.com/cat.jpg');
            assert.equal(body.recommendations[0].favicon, 'https://catpictures.com/favicon.ico');
            assert.equal(body.recommendations[0].one_click_subscribe, false);
        });

        it('Can edit recommendation and set nullable fields to null', async function () {
            const id = await addDummyRecommendation();
            const {body} = await agent.put(`recommendations/${id}/`)
                .body({
                    recommendations: [{
                        description: null,
                        excerpt: null,
                        featured_image: null,
                        favicon: null
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
            assert.equal(body.recommendations[0].description, null);
            assert.equal(body.recommendations[0].excerpt, null);
            assert.equal(body.recommendations[0].featured_image, null);
            assert.equal(body.recommendations[0].favicon, null);
        });

        it('Can edit some fields of a recommendation without changing others', async function () {
            const id = await addDummyRecommendation();
            const {body} = await agent.put(`recommendations/${id}/`)
                .body({
                    recommendations: [{
                        title: 'Changed'
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
            assert.equal(body.recommendations[0].title, 'Changed');
            assert.equal(body.recommendations[0].url, 'https://recommendation0.com/');
            assert.equal(body.recommendations[0].description, 'Description 0');
            assert.equal(body.recommendations[0].excerpt, 'Test excerpt');
            assert.equal(body.recommendations[0].featured_image, 'https://recommendation0.com/featured.jpg');
            assert.equal(body.recommendations[0].favicon, 'https://recommendation0.com/favicon.ico');
            assert.equal(body.recommendations[0].one_click_subscribe, true);
        });

        it('Cannot use invalid protocols when editing', async function () {
            const id = await addDummyRecommendation();

            await agent.put(`recommendations/${id}/`)
                .body({
                    recommendations: [{
                        title: 'Cat Pictures',
                        url: 'https://dogpictures.com',
                        description: 'Because cats are cute',
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
    });

    describe('add', function () {
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
            assert.equal(body.recommendations[0].description, null);
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
                        description: 'Because dogs are cute',
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
            assert.equal(body.recommendations[0].description, 'Because dogs are cute');
            assert.equal(body.recommendations[0].excerpt, 'Dogs are cute');
            assert.equal(body.recommendations[0].featured_image, 'https://dogpictures.com/dog.jpg');
            assert.equal(body.recommendations[0].favicon, 'https://dogpictures.com/favicon.ico');
            assert.equal(body.recommendations[0].one_click_subscribe, true);
        });

        it('Can add a recommendation with the same hostname but different paths', async function () {
            // Add a recommendation with URL https://recommendation3.com
            await addDummyRecommendation(3);

            await agent.post('recommendations/')
                .body({
                    recommendations: [{
                        title: 'Recommendation 3 with a different path',
                        url: 'https://recommendation3.com/path-1'
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
        });

        it('Cannot add the same recommendation URL twice (exact URL match)', async function () {
            // Add a recommendation with URL https://recommendation3.com
            await addDummyRecommendation(3);

            await agent.post('recommendations/')
                .body({
                    recommendations: [{
                        title: 'Recommendation 3 with the exact same URL',
                        url: 'https://recommendation3.com'
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                });
        });

        it('Cannot add the same recommendation twice (partial URL match)', async function () {
            // Add a recommendation with URL https://recommendation3.com
            await addDummyRecommendation(3);

            await agent.post('recommendations/')
                .body({
                    recommendations: [{
                        title: 'Recommendation 3 with the same hostname and pathname, but with different protocol, www, query params and hash fragement',
                        url: 'http://www.recommendation3.com/?query=1#hash'
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                });
        });
    });

    describe('check', function () {
        it('Can check a recommendation url', async function () {
            nock('https://dogpictures.com')
                .get('/members/api/site')
                .reply(200, {
                    site: {
                        title: 'Dog Pictures',
                        description: 'Because dogs are cute',
                        cover_image: 'https://dogpictures.com/dog.jpg',
                        icon: 'https://dogpictures.com/favicon.ico',
                        allow_external_signup: true
                    }
                });

            const {body} = await agent.post('recommendations/check/')
                .body({
                    recommendations: [{
                        url: 'https://dogpictures.com'
                    }]
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({});

            // Check everything is set correctly
            assert.equal(body.recommendations[0].title, 'Dog Pictures');
            assert.equal(body.recommendations[0].url, 'https://dogpictures.com/');
            assert.equal(body.recommendations[0].description, null);
            assert.equal(body.recommendations[0].excerpt, 'Because dogs are cute');
            assert.equal(body.recommendations[0].featured_image, 'https://dogpictures.com/dog.jpg');
            assert.equal(body.recommendations[0].favicon, 'https://dogpictures.com/favicon.ico');
            assert.equal(body.recommendations[0].one_click_subscribe, true);
        });

        it('Returns nullified values if site fails to fetch', async function () {
            nock('https://dogpictures.com')
                .get('/')
                .reply(404);

            const {body} = await agent.post('recommendations/check/')
                .body({
                    recommendations: [{
                        url: 'https://dogpictures.com'
                    }]
                })
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({});

            assert.equal(body.recommendations[0].title, null);
            assert.equal(body.recommendations[0].url, 'https://dogpictures.com/');
            assert.equal(body.recommendations[0].description, null);
            assert.equal(body.recommendations[0].excerpt, null);
            assert.equal(body.recommendations[0].featured_image, null);
            assert.equal(body.recommendations[0].favicon, null);
            assert.equal(body.recommendations[0].one_click_subscribe, false);
        });
    });

    describe('delete', function () {
        it('Can delete recommendation', async function () {
            const id = await addDummyRecommendation();
            await agent.delete(`recommendations/${id}/`)
                .expectStatus(204)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({});
        });
    });
});
