const sinon = require('sinon');
const _ = require('lodash');
const nock = require('nock');
const rewire = require('rewire');
const testUtils = require('../../../utils');
const indexnow = rewire('../../../../core/server/services/indexnow');
const events = require('../../../../core/server/lib/common/events');
const settingsCache = require('../../../../core/shared/settings-cache');
const labs = require('../../../../core/shared/labs');
const logging = require('@tryghost/logging');

describe('IndexNow', function () {
    let eventStub;
    let loggingStub;
    let settingsCacheStub;
    let labsStub;

    beforeEach(function () {
        eventStub = sinon.stub(events, 'on');
        settingsCacheStub = sinon.stub(settingsCache, 'get');
        labsStub = sinon.stub(labs, 'isSet');

        // Default: IndexNow enabled, site not private, API key set
        labsStub.withArgs('indexnow').returns(true);
        settingsCacheStub.withArgs('is_private').returns(false);
        settingsCacheStub.withArgs('indexnow_api_key').returns('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4');
    });

    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    describe('listen()', function () {
        it('should initialise events correctly', function () {
            indexnow.listen();
            eventStub.calledTwice.should.be.true();
            eventStub.calledWith('post.published').should.be.true();
            eventStub.calledWith('post.published.edited').should.be.true();
        });
    });

    describe('listener()', function () {
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

            const pingStub = sinon.stub().resolves();
            const resetIndexNow = indexnow.__set__('ping', pingStub);
            const listener = indexnow.__get__('indexnowListener');

            listener(testModel);

            pingStub.calledOnce.should.be.true();
            pingStub.calledWith(testPost).should.be.true();

            resetIndexNow();
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

            const pingStub = sinon.stub();
            const resetIndexNow = indexnow.__set__('ping', pingStub);
            const listener = indexnow.__get__('indexnowListener');

            listener(testModel, {importing: true});

            pingStub.calledOnce.should.be.false();

            resetIndexNow();
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

            const pingStub = sinon.stub();
            const resetIndexNow = indexnow.__set__('ping', pingStub);
            const listener = indexnow.__get__('indexnowListener');

            listener(testModel);

            pingStub.calledOnce.should.be.false();

            resetIndexNow();
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

            const pingStub = sinon.stub().resolves();
            const resetIndexNow = indexnow.__set__('ping', pingStub);
            const listener = indexnow.__get__('indexnowListener');

            listener(testModel);

            pingStub.calledOnce.should.be.true();

            resetIndexNow();
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

            const pingStub = sinon.stub().resolves();
            const resetIndexNow = indexnow.__set__('ping', pingStub);
            const listener = indexnow.__get__('indexnowListener');

            listener(testModel);

            pingStub.calledOnce.should.be.true();

            resetIndexNow();
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

            const pingStub = sinon.stub().resolves();
            const resetIndexNow = indexnow.__set__('ping', pingStub);
            const listener = indexnow.__get__('indexnowListener');

            listener(testModel);

            pingStub.calledOnce.should.be.true();

            resetIndexNow();
        });
    });

    describe('ping()', function () {
        const ping = indexnow.__get__('ping');

        it('with a post should execute ping', async function () {
            loggingStub = sinon.stub(logging, 'info');
            nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await ping(testPost);

            loggingStub.calledOnce.should.be.true();
        });

        it('with default post should not execute ping', async function () {
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            testPost.slug = 'welcome';

            await ping(testPost);

            pingRequest.isDone().should.be.false();
        });

        it('with a page should not execute ping', async function () {
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPage = _.clone(testUtils.DataGenerator.Content.posts[5]);

            await ping(testPage);

            pingRequest.isDone().should.be.false();
        });

        it('when labs.indexnow is false should not execute ping', async function () {
            labsStub.withArgs('indexnow').returns(false);

            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await ping(testPost);

            pingRequest.isDone().should.be.false();
        });

        it('when site is private should not execute ping', async function () {
            settingsCacheStub.withArgs('is_private').returns(true);

            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await ping(testPost);

            pingRequest.isDone().should.be.false();
        });

        it('when no API key is set should not execute ping and log warning', async function () {
            settingsCacheStub.withArgs('indexnow_api_key').returns(null);
            loggingStub = sinon.stub(logging, 'warn');

            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(200);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await ping(testPost);

            // Should NOT have made the ping request
            pingRequest.isDone().should.be.false();
            // Should have logged a warning
            loggingStub.calledOnce.should.be.true();
            loggingStub.args[0][0].should.containEql('API key not available');
        });

        it('should handle 202 response as success', async function () {
            loggingStub = sinon.stub(logging, 'info');
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(202);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await ping(testPost);

            pingRequest.isDone().should.be.true();
            loggingStub.calledOnce.should.be.true();
        });

        it('captures && logs errors from 400 requests', async function () {
            loggingStub = sinon.stub(logging, 'warn');
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(400);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await ping(testPost);

            pingRequest.isDone().should.be.true();
            loggingStub.calledOnce.should.be.true();
        });

        it('captures && logs validation errors from 422 requests', async function () {
            loggingStub = sinon.stub(logging, 'warn');
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(422);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await ping(testPost);

            pingRequest.isDone().should.be.true();
            loggingStub.calledOnce.should.be.true();
            loggingStub.args[0][0].message.should.containEql('key validation failed');
        });

        it('should behave correctly when getting a 429', async function () {
            loggingStub = sinon.stub(logging, 'warn');
            const pingRequest = nock('https://api.indexnow.org')
                .get(/\/indexnow/)
                .reply(429);
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            await ping(testPost);

            pingRequest.isDone().should.be.true();
            loggingStub.calledOnce.should.be.true();
        });
    });

    describe('getApiKey()', function () {
        it('should return the API key from settings', function () {
            const expectedKey = 'test-api-key-12345';
            settingsCacheStub.withArgs('indexnow_api_key').returns(expectedKey);

            const key = indexnow.getApiKey();
            key.should.equal(expectedKey);
        });

        it('should return null when no key is set', function () {
            settingsCacheStub.withArgs('indexnow_api_key').returns(null);

            const key = indexnow.getApiKey();
            (key === null).should.be.true();
        });
    });
});
