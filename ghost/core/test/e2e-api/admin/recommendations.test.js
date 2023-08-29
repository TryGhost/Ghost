const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {anyObjectId, anyISODateTime, anyContentVersion, anyEtag} = matchers;
const assert = require('assert/strict');
const recommendationsService = require('../../../core/server/services/recommendations');

describe('Recommendations Admin API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts');
        await agent.loginAsOwner();
    });

    afterEach(function () {
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
                etag: anyEtag
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
        assert.equal(body.recommendations[0].url, 'https://dogpictures.com');
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
                etag: anyEtag
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
        assert.equal(body.recommendations[0].url, 'https://dogpictures.com');
        assert.equal(body.recommendations[0].reason, 'Because dogs are cute');
        assert.equal(body.recommendations[0].excerpt, 'Dogs are cute');
        assert.equal(body.recommendations[0].featured_image, 'https://dogpictures.com/dog.jpg');
        assert.equal(body.recommendations[0].favicon, 'https://dogpictures.com/favicon.ico');
        assert.equal(body.recommendations[0].one_click_subscribe, true);
    });

    it('Can edit recommendation', async function () {
        const id = (await recommendationsService.repository.getAll())[0].id;
        const {body} = await agent.put(`recommendations/${id}/`)
            .body({
                recommendations: [{
                    title: 'Cat Pictures',
                    url: 'https://catpictures.com',
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
                        created_at: anyISODateTime
                    }
                ]
            });

        // Check everything is set correctly
        assert.equal(body.recommendations[0].id, id);
        assert.equal(body.recommendations[0].title, 'Cat Pictures');
        assert.equal(body.recommendations[0].url, 'https://catpictures.com');
        assert.equal(body.recommendations[0].reason, 'Because cats are cute');
        assert.equal(body.recommendations[0].excerpt, 'Cats are cute');
        assert.equal(body.recommendations[0].featured_image, 'https://catpictures.com/cat.jpg');
        assert.equal(body.recommendations[0].favicon, 'https://catpictures.com/favicon.ico');
        assert.equal(body.recommendations[0].one_click_subscribe, false);
    });

    it('Can delete recommendation', async function () {
        const id = (await recommendationsService.repository.getAll())[0].id;
        await agent.delete(`recommendations/${id}/`)
            .expectStatus(204)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({});
    });

    it('Can browse', async function () {
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
                        created_at: anyISODateTime
                    }
                ]
            });
    });
});
