const assert = require('node:assert/strict');
const sinon = require('sinon');
const _ = require('lodash');
const nock = require('nock');
const testUtils = require('../../../../utils');
const request = require('@tryghost/request');
const IndexNowPingService = require('../../../../../core/server/services/indexnow-ping/indexnow-ping-service');

const VALID_API_KEY = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';

// Build an IndexNowPingService with fully injected fakes. The real @tryghost/request
// is injected so nock continues to intercept at the HTTP layer, exactly as
// before - only the stateful/config singletons become injected fakes.
function createService() {
    const settingsCache = {get: sinon.stub()};
    settingsCache.get.withArgs('is_private').returns(false);
    settingsCache.get.withArgs('indexnow_api_key').returns(VALID_API_KEY);

    const config = {isPrivacyDisabled: sinon.stub()};
    config.isPrivacyDisabled.withArgs('useIndexNow').returns(false);

    const labs = {isSet: sinon.stub()};
    labs.isSet.withArgs('indexnow').returns(true);

    const urlService = {
        facade: {
            getUrlForResource: sinon.stub().returns('https://example.com/my-post/')
        }
    };

    const urlUtils = {
        urlFor: sinon.stub().returns('https://example.com'),
        urlJoin: (...args) => args.join('/')
    };

    const logging = {info: sinon.stub(), warn: sinon.stub(), error: sinon.stub()};

    // Chainable so `events.removeListener(...).on(...)` works.
    const events = {removeListener: sinon.stub().returnsThis(), on: sinon.stub().returnsThis()};

    const deps = {settingsCache, config, labs, urlService, urlUtils, request, logging, events};
    const service = new IndexNowPingService(deps);

    return {service, deps};
}

describe('IndexNow', function () {
    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    describe('subscribeEvents()', function () {
        it('registers listeners for post.published and post.published.edited', function () {
            const {service, deps} = createService();

            service.subscribeEvents();

            sinon.assert.calledTwice(deps.events.on);
            sinon.assert.calledWith(deps.events.on, 'post.published');
            sinon.assert.calledWith(deps.events.on, 'post.published.edited');
        });
    });

    describe('handlePostEvent()', function () {
        it('calls ping() with toJSONified model including tags and authors when content changed', function () {
            const {service} = createService();
            const pingStub = sinon.stub(service, 'ping').resolves();

            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
            const testAuthor = _.clone(testUtils.DataGenerator.Content.users[0]);
            const testTag = _.clone(testUtils.DataGenerator.Content.tags[0]);

            const testModel = {
                toJSON: function () {
                    return testPost;
                },
                related: function (relation) {
                    return {
                        toJSON: function () {
                            if (relation === 'authors') {
                                return [testAuthor];
                            }

                            if (relation === 'tags') {
                                return [testTag];
                            }

                            return [];
                        }
                    };
                },
                get: function (key) {
                    if (key === 'status') {
                        return 'published';
                    }
                    if (key === 'html') {
                        return '<p>new content</p>';
                    }
                },
                previous: function (key) {
                    if (key === 'status') {
                        return 'draft';
                    }
                    if (key === 'html') {
                        return null;
                    }
                }
            };

            service.handlePostEvent(testModel);

            sinon.assert.calledOnce(pingStub);
            // tags and authors must reach ping() (and onward the URL service) so
            // the lazy backend can evaluate collection filters (e.g. `tag:foo`)
            // when building the URL
            sinon.assert.calledWith(
                pingStub,
                sinon.match({...testPost, authors: [testAuthor], tags: [testTag]})
            );
        });

        it('does not call ping() when importing', function () {
            const {service} = createService();
            const pingStub = sinon.stub(service, 'ping').resolves();

            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
            const testModel = {
                toJSON: function () {
                    return testPost;
                },
                get: function () {
                    return 'published';
                },
                previous: function () {
                    return 'draft';
                }
            };

            service.handlePostEvent(testModel, {importing: true});

            sinon.assert.notCalled(pingStub);
        });

        it('does not call ping() when no SEO-relevant fields have changed', function () {
            const {service} = createService();
            const pingStub = sinon.stub(service, 'ping').resolves();

            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
            const values = {
                status: 'published',
                html: '<p>same content</p>',
                title: 'Same Title',
                slug: 'same-slug',
                meta_title: 'Same Meta Title',
                meta_description: 'Same meta description',
                canonical_url: null
            };
            const testModel = {
                toJSON: function () {
                    return testPost;
                },
                get: function (key) {
                    return values[key];
                },
                previous: function (key) {
                    return values[key];
                }
            };

            service.handlePostEvent(testModel);

            sinon.assert.notCalled(pingStub);
        });

        it('calls ping() when title changes', function () {
            const {service} = createService();
            const pingStub = sinon.stub(service, 'ping').resolves();

            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
            const testModel = {
                toJSON: function () {
                    return testPost;
                },
                related: function () {
                    return {toJSON: () => []};
                },
                get: function (key) {
                    if (key === 'title') {
                        return 'New Title';
                    }
                    return 'same-value';
                },
                previous: function (key) {
                    if (key === 'title') {
                        return 'Old Title';
                    }
                    return 'same-value';
                }
            };

            service.handlePostEvent(testModel);

            sinon.assert.calledOnce(pingStub);
        });

        it('calls ping() when slug changes', function () {
            const {service} = createService();
            const pingStub = sinon.stub(service, 'ping').resolves();

            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
            const testModel = {
                toJSON: function () {
                    return testPost;
                },
                related: function () {
                    return {toJSON: () => []};
                },
                get: function (key) {
                    if (key === 'slug') {
                        return 'new-slug';
                    }
                    return 'same-value';
                },
                previous: function (key) {
                    if (key === 'slug') {
                        return 'old-slug';
                    }
                    return 'same-value';
                }
            };

            service.handlePostEvent(testModel);

            sinon.assert.calledOnce(pingStub);
        });

        it('calls ping() when meta_description changes', function () {
            const {service} = createService();
            const pingStub = sinon.stub(service, 'ping').resolves();

            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
            const testModel = {
                toJSON: function () {
                    return testPost;
                },
                related: function () {
                    return {toJSON: () => []};
                },
                get: function (key) {
                    if (key === 'meta_description') {
                        return 'New meta description';
                    }
                    return 'same-value';
                },
                previous: function (key) {
                    if (key === 'meta_description') {
                        return 'Old meta description';
                    }
                    return 'same-value';
                }
            };

            service.handlePostEvent(testModel);

            sinon.assert.calledOnce(pingStub);
        });
    });

    describe('ping()', function () {
        it('with a post should execute ping', async function () {
            const {service, deps} = createService();
            nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await service.ping(testPost);

            sinon.assert.calledOnce(deps.logging.info);
            assert.equal(deps.logging.info.args[0][0].event.name, 'indexnow.pinged');
            assert.equal(deps.logging.info.args[0][0].http.response.status_code, 200);
        });

        it('does not ping when the post has no resolvable URL (/404/)', async function () {
            const {service, deps} = createService();
            deps.urlService.facade.getUrlForResource.returns('https://example.com/404/');
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await service.ping(testPost);

            assert.equal(pingRequest.isDone(), false);
            sinon.assert.calledOnce(deps.logging.warn);
            const logged = deps.logging.warn.args[0][0];
            assert.equal(logged.event.name, 'indexnow.unresolved_url');
            assert.equal(logged.post.url, 'https://example.com/404/');
            assert.equal(logged.post.id, testPost.id);
            assert.equal(logged.post.slug, testPost.slug);
        });

        it('with default post should not execute ping', async function () {
            const {service} = createService();
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            testPost.slug = 'welcome';

            await service.ping(testPost);

            assert.equal(pingRequest.isDone(), false);
        });

        it('with a page should not execute ping', async function () {
            const {service} = createService();
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPage = _.clone(testUtils.DataGenerator.Content.posts[5]);

            await service.ping(testPage);

            assert.equal(pingRequest.isDone(), false);
        });

        it('when labs.indexnow is false should not execute ping', async function () {
            const {service, deps} = createService();
            deps.labs.isSet.withArgs('indexnow').returns(false);

            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await service.ping(testPost);

            assert.equal(pingRequest.isDone(), false);
        });

        it('when privacy.useIndexNow is disabled should not execute ping', async function () {
            const {service, deps} = createService();
            deps.config.isPrivacyDisabled.withArgs('useIndexNow').returns(true);

            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await service.ping(testPost);

            assert.equal(pingRequest.isDone(), false);
        });

        it('when site is private should not execute ping', async function () {
            const {service, deps} = createService();
            deps.settingsCache.get.withArgs('is_private').returns(true);

            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await service.ping(testPost);

            assert.equal(pingRequest.isDone(), false);
        });

        it('when no API key is set should not execute ping and log warning', async function () {
            const {service, deps} = createService();
            deps.settingsCache.get.withArgs('indexnow_api_key').returns(null);

            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await service.ping(testPost);

            // Should NOT have made the ping request
            assert.equal(pingRequest.isDone(), false);
            // Should have logged a warning with a structured event
            sinon.assert.calledOnce(deps.logging.warn);
            assert.equal(deps.logging.warn.args[0][0].event.name, 'indexnow.api_key_missing');
            assert(deps.logging.warn.args[0][1].includes('API key not available'));
        });

        it('should handle 202 response as success', async function () {
            const {service, deps} = createService();
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(202);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await service.ping(testPost);

            assert.equal(pingRequest.isDone(), true);
            sinon.assert.calledOnce(deps.logging.info);
            assert.equal(deps.logging.info.args[0][0].event.name, 'indexnow.pinged');
            assert.equal(deps.logging.info.args[0][0].http.response.status_code, 202);
        });

        it('captures && logs errors from 400 requests', async function () {
            const {service, deps} = createService();
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(400);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await service.ping(testPost);

            assert.equal(pingRequest.isDone(), true);
            sinon.assert.calledOnce(deps.logging.warn);
            assert.equal(deps.logging.warn.args[0][0].event.name, 'indexnow.ping_failed');
            assert.equal(deps.logging.warn.args[0][0].http.response.status_code, 400);
        });

        it('captures && logs validation errors from 422 requests', async function () {
            const {service, deps} = createService();
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(422);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await service.ping(testPost);

            assert.equal(pingRequest.isDone(), true);
            sinon.assert.calledOnce(deps.logging.warn);
            assert.equal(deps.logging.warn.args[0][0].event.name, 'indexnow.key_validation_failed');
            assert.equal(deps.logging.warn.args[0][0].http.response.status_code, 422);
        });

        it('should behave correctly when getting a 429', async function () {
            const {service, deps} = createService();
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(429);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await service.ping(testPost);

            assert.equal(pingRequest.isDone(), true);
            sinon.assert.calledOnce(deps.logging.warn);
            assert.equal(deps.logging.warn.args[0][0].event.name, 'indexnow.rate_limited');
            assert.equal(deps.logging.warn.args[0][0].http.response.status_code, 429);
        });

        it('logs the real status code for an unexpected 2xx response', async function () {
            const {service, deps} = createService();
            // 204 is a 2xx that request() does not throw on, so it hits the
            // manual unexpected-status check rather than an HTTP error
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(204);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await service.ping(testPost);

            assert.equal(pingRequest.isDone(), true);
            sinon.assert.calledOnce(deps.logging.warn);
            assert.equal(deps.logging.warn.args[0][0].event.name, 'indexnow.ping_failed');
            assert.equal(deps.logging.warn.args[0][0].http.response.status_code, 204);
        });
    });

    describe('ping() error classification (got HTTPError shape)', function () {
        async function pingWithHttpError(service, statusCode) {
            nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(statusCode);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
            await service.ping(testPost);
        }

        it('classifies a 429 (status on err.response.statusCode) as rate_limited', async function () {
            const {service, deps} = createService();
            await pingWithHttpError(service, 429);

            sinon.assert.calledOnce(deps.logging.warn);
            assert.equal(deps.logging.warn.args[0][0].event.name, 'indexnow.rate_limited');
            assert.equal(deps.logging.warn.args[0][0].http.response.status_code, 429);
        });

        it('classifies a 422 (status on err.response.statusCode) as key_validation_failed', async function () {
            const {service, deps} = createService();
            await pingWithHttpError(service, 422);

            sinon.assert.calledOnce(deps.logging.warn);
            assert.equal(deps.logging.warn.args[0][0].event.name, 'indexnow.key_validation_failed');
            assert.equal(deps.logging.warn.args[0][0].http.response.status_code, 422);
        });

        it('classifies a 403 (key not valid) as key_validation_failed', async function () {
            const {service, deps} = createService();
            await pingWithHttpError(service, 403);

            sinon.assert.calledOnce(deps.logging.warn);
            assert.equal(deps.logging.warn.args[0][0].event.name, 'indexnow.key_validation_failed');
            assert.equal(deps.logging.warn.args[0][0].http.response.status_code, 403);
        });

        it('classifies other 5xx errors (status on err.response.statusCode) as ping_failed', async function () {
            const {service, deps} = createService();
            await pingWithHttpError(service, 503);

            sinon.assert.calledOnce(deps.logging.warn);
            assert.equal(deps.logging.warn.args[0][0].event.name, 'indexnow.ping_failed');
            assert.equal(deps.logging.warn.args[0][0].http.response.status_code, 503);
        });

        // URL resolution runs real filter evaluation in the lazy URL service and
        // can throw; a throw must be swallowed and logged, never rejected out of
        // ping() (the event listener's catch is silent, so a rejection here
        // would vanish without a trace).
        it('logs and swallows a throw from URL resolution as ping_failed', async function () {
            const {service, deps} = createService();
            deps.urlService.facade.getUrlForResource.throws(new Error('filter evaluation failed'));
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await service.ping(testPost);

            sinon.assert.calledOnce(deps.logging.warn);
            assert.equal(deps.logging.warn.args[0][0].event.name, 'indexnow.ping_failed');
            assert.equal(deps.logging.warn.args[0][0].post.url, null);
        });
    });

    describe('getApiKey()', function () {
        it('should return the API key from settings', function () {
            const {service, deps} = createService();
            const expectedKey = 'test-api-key-12345';
            deps.settingsCache.get.withArgs('indexnow_api_key').returns(expectedKey);

            assert.equal(service.getApiKey(), expectedKey);
        });

        it('should return null when no key is set', function () {
            const {service, deps} = createService();
            deps.settingsCache.get.withArgs('indexnow_api_key').returns(null);

            assert.equal(service.getApiKey(), null);
        });
    });

    // Pin which URL ping() actually sends. The ping() block above uses nock to
    // intercept the HTTP request but never inspects the `?url=...` query
    // parameter; that's the exact value a future change to the url-service call
    // shape (e.g. swapping the legacy id-based method for a resource-based facade
    // method) could regress without anyone noticing.
    describe('ping() URL output', function () {
        const POST_URL = 'https://my-blog.example/some-post/';

        it('passes the post URL into the IndexNow request', async function () {
            const {service, deps} = createService();

            // Bind the stub to the exact resource shape production passes
            // (`{...post, type: 'posts'}`) so a regression that drops the type
            // override or the spread surfaces here.
            deps.urlService.facade.getUrlForResource
                .withArgs(sinon.match({id: 'abc', type: 'posts'}), {absolute: true})
                .returns(POST_URL);

            const pingRequest = nock('https://api.indexnow.org')
                .get('/indexnow')
                .query(query => query.url === POST_URL)
                .reply(200);

            const post = {id: 'abc', slug: 'some-post', type: 'post'};

            await service.ping(post);

            sinon.assert.calledOnce(deps.urlService.facade.getUrlForResource);
            assert.equal(pingRequest.isDone(), true);
        });
    });
});
