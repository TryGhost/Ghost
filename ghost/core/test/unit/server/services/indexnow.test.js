const assert = require('node:assert/strict');
const sinon = require('sinon');
const _ = require('lodash');
const nock = require('nock');
const testUtils = require('../../../utils');
const indexnow = require('../../../../core/server/services/indexnow');
const events = require('../../../../core/server/lib/common/events');
const settingsCache = require('../../../../core/shared/settings-cache');
const config = require('../../../../core/shared/config');
const labs = require('../../../../core/shared/labs');
const logging = require('@tryghost/logging');
const urlService = require('../../../../core/server/services/url');

describe('IndexNow', function () {
    let eventStub;
    let loggingStub;
    let settingsCacheStub;
    let labsStub;
    let privacyDisabledStub;

    beforeEach(function () {
        eventStub = sinon.stub(events, 'on');
        settingsCacheStub = sinon.stub(settingsCache, 'get');
        labsStub = sinon.stub(labs, 'isSet');
        privacyDisabledStub = sinon.stub(config, 'isPrivacyDisabled');

        // Default: IndexNow enabled, site not private, API key set, privacy not disabled
        labsStub.withArgs('indexnow').returns(true);
        settingsCacheStub.withArgs('is_private').returns(false);
        settingsCacheStub.withArgs('indexnow_api_key').returns('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4');
        privacyDisabledStub.withArgs('useIndexNow').returns(false);
    });

    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    describe('listen()', function () {
        it('should initialise events correctly', function () {
            indexnow.listen();
            sinon.assert.calledTwice(eventStub);
            sinon.assert.calledWith(eventStub, 'post.published');
            sinon.assert.calledWith(eventStub, 'post.published.edited');
        });
    });

    describe('listener()', function () {
        let listener;
        let urlStub;

        beforeEach(function () {
            urlStub = sinon.stub(urlService.facade, 'getUrlForResource').returns('https://example.com/my-post/');
            settingsCacheStub.withArgs('indexnow_api_key').returns(null);
            loggingStub = sinon.stub(logging, 'warn');

            indexnow.listen();
            listener = eventStub.firstCall.args[1];
        });

        it('calls ping() with toJSONified model when content changed', function () {
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            const testModel = {
                toJSON: function () {
                    return testPost;
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

            listener(testModel);

            sinon.assert.calledOnce(urlStub);
            sinon.assert.calledWith(urlStub, sinon.match({...testPost, type: 'posts'}), {absolute: true});
        });

        it('does not call ping() when importing', function () {
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

            listener(testModel, {importing: true});

            sinon.assert.notCalled(urlStub);
        });

        it('does not call ping() when no SEO-relevant fields have changed', function () {
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            const testModel = {
                toJSON: function () {
                    return testPost;
                },
                get: function (key) {
                    // Return same values for all SEO-relevant fields
                    const values = {
                        status: 'published',
                        html: '<p>same content</p>',
                        title: 'Same Title',
                        slug: 'same-slug',
                        meta_title: 'Same Meta Title',
                        meta_description: 'Same meta description',
                        canonical_url: null
                    };
                    return values[key];
                },
                previous: function (key) {
                    // Return same values as get() - no changes
                    const values = {
                        status: 'published',
                        html: '<p>same content</p>',
                        title: 'Same Title',
                        slug: 'same-slug',
                        meta_title: 'Same Meta Title',
                        meta_description: 'Same meta description',
                        canonical_url: null
                    };
                    return values[key];
                }
            };

            listener(testModel);

            sinon.assert.notCalled(urlStub);
        });

        it('calls ping() when title changes', function () {
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            const testModel = {
                toJSON: function () {
                    return testPost;
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

            listener(testModel);

            sinon.assert.calledOnce(urlStub);
        });

        it('calls ping() when slug changes', function () {
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            const testModel = {
                toJSON: function () {
                    return testPost;
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

            listener(testModel);

            sinon.assert.calledOnce(urlStub);
        });

        it('calls ping() when meta_description changes', function () {
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            const testModel = {
                toJSON: function () {
                    return testPost;
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

            listener(testModel);

            sinon.assert.calledOnce(urlStub);
        });
    });

    describe('ping()', function () {
        let urlStub;

        beforeEach(function () {
            urlStub = sinon.stub(urlService.facade, 'getUrlForResource').returns('https://example.com/my-post/');
        });

        it('with a post should execute ping', async function () {
            loggingStub = sinon.stub(logging, 'info');
            nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await indexnow.ping(testPost);

            sinon.assert.calledOnce(loggingStub);
            assert.equal(loggingStub.args[0][0].event.name, 'indexnow.pinged');
            assert.equal(loggingStub.args[0][0].http.response.status_code, 200);
        });

        it('does not ping when the post has no resolvable URL (/404/)', async function () {
            urlStub.returns('https://example.com/404/');
            loggingStub = sinon.stub(logging, 'warn');
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await indexnow.ping(testPost);

            assert.equal(pingRequest.isDone(), false);
            sinon.assert.calledOnce(loggingStub);
            const logged = loggingStub.args[0][0];
            assert.equal(logged.event.name, 'indexnow.unresolved_url');
            assert.equal(logged.post.url, 'https://example.com/404/');
            assert.equal(logged.post.id, testPost.id);
            assert.equal(logged.post.slug, testPost.slug);
        });

        it('with default post should not execute ping', async function () {
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            testPost.slug = 'welcome';

            await indexnow.ping(testPost);

            assert.equal(pingRequest.isDone(), false);
        });

        it('with a page should not execute ping', async function () {
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPage = _.clone(testUtils.DataGenerator.Content.posts[5]);

            await indexnow.ping(testPage);

            assert.equal(pingRequest.isDone(), false);
        });

        it('when labs.indexnow is false should not execute ping', async function () {
            labsStub.withArgs('indexnow').returns(false);

            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await indexnow.ping(testPost);

            assert.equal(pingRequest.isDone(), false);
        });

        it('when privacy.useIndexNow is disabled should not execute ping', async function () {
            privacyDisabledStub.withArgs('useIndexNow').returns(true);

            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await indexnow.ping(testPost);

            assert.equal(pingRequest.isDone(), false);
        });

        it('when site is private should not execute ping', async function () {
            settingsCacheStub.withArgs('is_private').returns(true);

            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await indexnow.ping(testPost);

            assert.equal(pingRequest.isDone(), false);
        });

        it('when no API key is set should not execute ping and log warning', async function () {
            settingsCacheStub.withArgs('indexnow_api_key').returns(null);
            loggingStub = sinon.stub(logging, 'warn');

            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await indexnow.ping(testPost);

            // Should NOT have made the ping request
            assert.equal(pingRequest.isDone(), false);
            // Should have logged a warning with a structured event
            sinon.assert.calledOnce(loggingStub);
            assert.equal(loggingStub.args[0][0].event.name, 'indexnow.api_key_missing');
            assert(loggingStub.args[0][1].includes('API key not available'));
        });

        it('should handle 202 response as success', async function () {
            loggingStub = sinon.stub(logging, 'info');
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(202);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await indexnow.ping(testPost);

            assert.equal(pingRequest.isDone(), true);
            sinon.assert.calledOnce(loggingStub);
            assert.equal(loggingStub.args[0][0].event.name, 'indexnow.pinged');
            assert.equal(loggingStub.args[0][0].http.response.status_code, 202);
        });

        it('captures && logs errors from 400 requests', async function () {
            loggingStub = sinon.stub(logging, 'warn');
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(400);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await indexnow.ping(testPost);

            assert.equal(pingRequest.isDone(), true);
            sinon.assert.calledOnce(loggingStub);
            assert.equal(loggingStub.args[0][0].event.name, 'indexnow.ping_failed');
            assert.equal(loggingStub.args[0][0].http.response.status_code, 400);
        });

        it('captures && logs validation errors from 422 requests', async function () {
            loggingStub = sinon.stub(logging, 'warn');
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(422);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await indexnow.ping(testPost);

            assert.equal(pingRequest.isDone(), true);
            sinon.assert.calledOnce(loggingStub);
            assert.equal(loggingStub.args[0][0].event.name, 'indexnow.key_validation_failed');
            assert.equal(loggingStub.args[0][0].http.response.status_code, 422);
        });

        it('should behave correctly when getting a 429', async function () {
            loggingStub = sinon.stub(logging, 'warn');
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(429);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await indexnow.ping(testPost);

            assert.equal(pingRequest.isDone(), true);
            sinon.assert.calledOnce(loggingStub);
            assert.equal(loggingStub.args[0][0].event.name, 'indexnow.rate_limited');
            assert.equal(loggingStub.args[0][0].http.response.status_code, 429);
        });

        it('logs the real status code for an unexpected 2xx response', async function () {
            loggingStub = sinon.stub(logging, 'warn');
            // 204 is a 2xx that request() does not throw on, so it hits the
            // manual unexpected-status check rather than an HTTP error
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(204);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await indexnow.ping(testPost);

            assert.equal(pingRequest.isDone(), true);
            sinon.assert.calledOnce(loggingStub);
            assert.equal(loggingStub.args[0][0].event.name, 'indexnow.ping_failed');
            assert.equal(loggingStub.args[0][0].http.response.status_code, 204);
        });
    });

    describe('ping() error classification (got HTTPError shape)', function () {
        beforeEach(function () {
            sinon.stub(urlService.facade, 'getUrlForResource').returns('https://example.com/my-post/');
            loggingStub = sinon.stub(logging, 'warn');
        });

        async function pingWithHttpError(statusCode) {
            nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(statusCode);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
            await indexnow.ping(testPost);
        }

        it('classifies a 429 (status on err.response.statusCode) as rate_limited', async function () {
            await pingWithHttpError(429);

            sinon.assert.calledOnce(loggingStub);
            assert.equal(loggingStub.args[0][0].event.name, 'indexnow.rate_limited');
            assert.equal(loggingStub.args[0][0].http.response.status_code, 429);
        });

        it('classifies a 422 (status on err.response.statusCode) as key_validation_failed', async function () {
            await pingWithHttpError(422);

            sinon.assert.calledOnce(loggingStub);
            assert.equal(loggingStub.args[0][0].event.name, 'indexnow.key_validation_failed');
            assert.equal(loggingStub.args[0][0].http.response.status_code, 422);
        });

        it('classifies a 403 (key not valid) as key_validation_failed', async function () {
            await pingWithHttpError(403);

            sinon.assert.calledOnce(loggingStub);
            assert.equal(loggingStub.args[0][0].event.name, 'indexnow.key_validation_failed');
            assert.equal(loggingStub.args[0][0].http.response.status_code, 403);
        });

        it('classifies other 5xx errors (status on err.response.statusCode) as ping_failed', async function () {
            await pingWithHttpError(503);

            sinon.assert.calledOnce(loggingStub);
            assert.equal(loggingStub.args[0][0].event.name, 'indexnow.ping_failed');
            assert.equal(loggingStub.args[0][0].http.response.status_code, 503);
        });
    });

    describe('getApiKey()', function () {
        it('should return the API key from settings', function () {
            const expectedKey = 'test-api-key-12345';
            settingsCacheStub.withArgs('indexnow_api_key').returns(expectedKey);

            const key = indexnow.getApiKey();
            assert.equal(key, expectedKey);
        });

        it('should return null when no key is set', function () {
            settingsCacheStub.withArgs('indexnow_api_key').returns(null);

            const key = indexnow.getApiKey();
            assert.equal((key === null), true);
        });
    });

    // Pin which URL ping() actually sends. The earlier `ping()` block above
    // uses nock to intercept the HTTP request but never inspects the
    // `?url=...` query parameter; that's the exact value a future change to
    // the url-service call shape (e.g. swapping the legacy id-based method
    // for a resource-based facade method) could regress without anyone
    // noticing.
    describe('ping() URL output', function () {
        const POST_URL = 'https://my-blog.example/some-post/';
        let getUrlForResourceStub;
        let pingRequest;

        beforeEach(function () {
            // Bind the stub to the exact resource shape production passes
            // (`{...post, type: 'posts'}`) so a regression that drops the
            // type override or the spread surfaces here.
            getUrlForResourceStub = sinon.stub(urlService.facade, 'getUrlForResource');
            getUrlForResourceStub
                .withArgs(sinon.match({id: 'abc', type: 'posts'}), {absolute: true})
                .returns(POST_URL);

            pingRequest = nock('https://api.indexnow.org')
                .get('/indexnow')
                .query((query) => {
                    return query.url === POST_URL;
                })
                .reply(200);

            settingsCacheStub.withArgs('indexnow_api_key').returns('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4');
        });

        it('passes the post URL into the IndexNow request', async function () {
            const post = {id: 'abc', slug: 'some-post', type: 'post'};

            await indexnow.ping(post);

            sinon.assert.calledOnce(getUrlForResourceStub);
            assert.equal(pingRequest.isDone(), true);
        });
    });
});
