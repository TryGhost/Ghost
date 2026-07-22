const assert = require('node:assert/strict');
const sinon = require('sinon');
const AudienceFeedbackService = require('../../../../../core/server/services/audience-feedback/audience-feedback-service');

describe('audienceFeedbackService', function () {
    const mockData = {
        uuid: '7b11de3c-dff9-4563-82ae-a281122d201d',
        postId: '634fc3901e0a291855d8b135',
        postTitle: 'somepost',
        score: 1,
        key: 'somekey'
    };
    const mockPost = {id: mockData.postId};

    describe('build link', function () {
        it('Can build link to post', async function () {
            const instance = new AudienceFeedbackService({
                urlService: {
                    facade: {
                        getUrlForResource: () => `https://localhost:2368/${mockData.postTitle}/`
                    }
                },
                config: {
                    baseURL: new URL('https://localhost:2368')
                }
            });
            const link = instance.buildLink(mockData.uuid, mockPost, mockData.score, mockData.key);
            const expectedLink = `https://localhost:2368/${mockData.postTitle}/#/feedback/${mockData.postId}/${mockData.score}/?uuid=${mockData.uuid}&key=somekey`;
            assert.equal(link.href, expectedLink);
        });

        it('Can build link to home page if post wasn\'t published', async function () {
            const instance = new AudienceFeedbackService({
                urlService: {
                    facade: {
                        getUrlForResource: () => `https://localhost:2368/${mockData.postTitle}/404/`
                    }
                },
                config: {
                    baseURL: new URL('https://localhost:2368')
                }
            });
            const link = instance.buildLink(mockData.uuid, mockPost, mockData.score, mockData.key);
            const expectedLink = `https://localhost:2368/#/feedback/${mockData.postId}/${mockData.score}/?uuid=${mockData.uuid}&key=somekey`;
            assert.equal(link.href, expectedLink);
        });

        it('Passes a posts resource (with id) to the facade', async function () {
            let receivedResource;
            const instance = new AudienceFeedbackService({
                urlService: {
                    facade: {
                        getUrlForResource: (resource) => {
                            receivedResource = resource;
                            return `https://localhost:2368/${mockData.postTitle}/`;
                        }
                    }
                },
                config: {
                    baseURL: new URL('https://localhost:2368')
                }
            });
            instance.buildLink(mockData.uuid, mockPost, mockData.score, mockData.key);
            assert.equal(receivedResource.id, mockData.postId);
            assert.equal(receivedResource.type, 'posts');
        });

        it('Serialises Bookshelf-model input so spread does not lose the id', async function () {
            // Real callers (email-renderer) pass a Bookshelf model. Spreading
            // one with `{...model}` skips prototype getters like `.id`. The
            // service must call `.toJSON()` first; this test pins that.
            //
            // toJSON also returns the DB-level `type: 'post'` (singular). The
            // service must override that to the routing-level `'posts'`
            // (plural) before handing the resource to the facade — the
            // assertion below captures that override explicitly.
            let receivedResource;
            const fakeBookshelfModel = {
                // No own `id` / `slug` properties; only `.toJSON()` exposes them.
                toJSON: () => ({id: mockData.postId, slug: mockData.postTitle, type: 'post'})
            };
            const instance = new AudienceFeedbackService({
                urlService: {
                    facade: {
                        getUrlForResource: (resource) => {
                            receivedResource = resource;
                            return `https://localhost:2368/${mockData.postTitle}/`;
                        }
                    }
                },
                config: {
                    baseURL: new URL('https://localhost:2368')
                }
            });
            const link = instance.buildLink(mockData.uuid, fakeBookshelfModel, mockData.score, mockData.key);
            assert.equal(receivedResource.id, mockData.postId);
            assert.equal(receivedResource.slug, mockData.postTitle);
            assert.equal(receivedResource.type, 'posts');
            // The hash fragment also depends on the post id, so the same bug
            // would surface in the produced URL.
            assert.match(link.href, new RegExp(`#/feedback/${mockData.postId}/`));
        });
    });

    describe('build fallback link', function () {
        it('builds the home-page feedback link without touching the url service', async function () {
            // Used when the post no longer exists: an id-only resource can't
            // be routed by the URL service (the lazy backend rejects it as
            // thin), so the fallback goes straight to the base URL — the same
            // destination buildLink picks when the service returns /404/.
            const getUrlForResource = sinon.stub();
            const instance = new AudienceFeedbackService({
                urlService: {facade: {getUrlForResource}},
                config: {baseURL: new URL('https://localhost:2368')}
            });

            const link = instance.buildFallbackLink(mockData.uuid, mockData.postId, mockData.score, mockData.key);

            sinon.assert.notCalled(getUrlForResource);
            const expectedLink = `https://localhost:2368/#/feedback/${mockData.postId}/${mockData.score}/?uuid=${mockData.uuid}&key=${mockData.key}`;
            assert.equal(link.href, expectedLink);
        });
    });

    describe('build email link', function () {
        function createInstance(baseURL) {
            return new AudienceFeedbackService({
                urlService: {facade: {}},
                config: {baseURL: new URL(baseURL)}
            });
        }

        it('builds an id-based redirect link with placeholders (no slug)', async function () {
            const instance = createInstance('https://localhost:2368/');
            const link = instance.buildEmailLink(mockPost, mockData.score);
            assert.equal(
                link,
                `https://localhost:2368/members/feedback/${mockData.postId}/${mockData.score}/?uuid=%%{uuid}%%&key=%%{key}%%`
            );
        });

        it('does not depend on the url service / post slug', async function () {
            const instance = createInstance('https://localhost:2368/');
            const link = instance.buildEmailLink(mockPost, 0);
            assert.match(link, new RegExp(`/members/feedback/${mockData.postId}/0/`));
            assert(!link.includes(mockData.postTitle));
        });

        it('respects a subdirectory base URL', async function () {
            const instance = createInstance('https://localhost:2368/blog/');
            const link = instance.buildEmailLink(mockPost, 1);
            assert.equal(
                link,
                `https://localhost:2368/blog/members/feedback/${mockData.postId}/1/?uuid=%%{uuid}%%&key=%%{key}%%`
            );
        });

        it('serialises Bookshelf-model input so spread does not lose the id', async function () {
            const instance = createInstance('https://localhost:2368/');
            const fakeBookshelfModel = {
                toJSON: () => ({id: mockData.postId, slug: mockData.postTitle, type: 'post'})
            };
            const link = instance.buildEmailLink(fakeBookshelfModel, 1);
            assert.match(link, new RegExp(`/members/feedback/${mockData.postId}/1/`));
        });
    });
});
