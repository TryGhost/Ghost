const assert = require('node:assert/strict');
const sinon = require('sinon');
const _ = require('lodash');
const rewire = require('rewire');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/config-utils');

// Stuff we test
const slack = rewire('../../../../core/server/services/slack');

const events = require('../../../../core/server/lib/common/events');
const logging = require('@tryghost/logging');
const imageLib = require('../../../../core/server/lib/image');
const urlService = require('../../../../core/server/services/url');
const settingsCache = require('../../../../core/shared/settings-cache');

// Test data
const slackURL = 'https://hooks.slack.com/services/a-b-c-d';

describe('Slack', function () {
    let eventStub;
    let loggingStub;

    beforeEach(function () {
        eventStub = sinon.stub(events, 'on');
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    it('listen() should initialise event correctly', function () {
        slack.listen();
        sinon.assert.calledTwice(eventStub);
        sinon.assert.calledWith(eventStub.firstCall, 'post.published', slack.__get__('slackListener'));
        sinon.assert.calledWith(eventStub.secondCall, 'slack.test', slack.__get__('slackTestPing'));
    });

    it('listener() calls ping() with toJSONified model including tags and authors', function () {
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
            }
        };

        const pingStub = sinon.stub();
        const resetSlack = slack.__set__('ping', pingStub);
        const listener = slack.__get__('slackListener');

        listener(testModel);

        sinon.assert.calledOnce(pingStub);
        // tags must be attached so the lazy URL service can evaluate
        // collection filters like `tag:foo` when building the post URL
        sinon.assert.calledWith(pingStub, {
            ...testPost,
            authors: [testAuthor],
            tags: [testTag]
        });

        // Reset slack ping method
        resetSlack();
    });

    it('listener() does not call ping() when importing', function () {
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

        const testModel = {
            toJSON: function () {
                return testPost;
            }
        };

        const pingStub = sinon.stub();
        const resetSlack = slack.__set__('ping', pingStub);
        const listener = slack.__get__('slackListener');

        listener(testModel, {importing: true});

        sinon.assert.notCalled(pingStub);

        // Reset slack ping method
        resetSlack();
    });

    it('listener() passes all tags when model has multiple related tags', function () {
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
        const testAuthor = _.clone(testUtils.DataGenerator.Content.users[0]);
        const testTag1 = _.clone(testUtils.DataGenerator.Content.tags[0]);
        const testTag2 = _.clone(testUtils.DataGenerator.Content.tags[1]);

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
                            return [testTag1, testTag2];
                        }
                        return [];
                    }
                };
            }
        };

        const pingStub = sinon.stub();
        const resetSlack = slack.__set__('ping', pingStub);
        const listener = slack.__get__('slackListener');

        listener(testModel);

        sinon.assert.calledOnce(pingStub);
        const pingArg = pingStub.firstCall.args[0];
        assert.deepEqual(pingArg.tags, [testTag1, testTag2]);

        resetSlack();
    });

    it('listener() tags from model.related() override any tags embedded in toJSON result', function () {
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
        // Embed a stale tag directly in the post JSON - related() result must win
        const embeddedTag = {id: 'stale-tag-id', name: 'Stale Tag', slug: 'stale-tag'};
        testPost.tags = [embeddedTag];

        const relatedTag = _.clone(testUtils.DataGenerator.Content.tags[2]);
        const testAuthor = _.clone(testUtils.DataGenerator.Content.users[0]);

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
                            return [relatedTag];
                        }
                        return [];
                    }
                };
            }
        };

        const pingStub = sinon.stub();
        const resetSlack = slack.__set__('ping', pingStub);
        const listener = slack.__get__('slackListener');

        listener(testModel);

        sinon.assert.calledOnce(pingStub);
        const pingArg = pingStub.firstCall.args[0];
        // tags from related() must take precedence over the toJSON() snapshot
        assert.deepEqual(pingArg.tags, [relatedTag]);
        assert.notDeepEqual(pingArg.tags, [embeddedTag]);

        resetSlack();
    });

    it('listener() passes empty tags array when model has no related tags', function () {
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
        const testAuthor = _.clone(testUtils.DataGenerator.Content.users[0]);

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
                        return [];
                    }
                };
            }
        };

        const pingStub = sinon.stub();
        const resetSlack = slack.__set__('ping', pingStub);
        const listener = slack.__get__('slackListener');

        listener(testModel);

        sinon.assert.calledOnce(pingStub);
        const pingArg = pingStub.firstCall.args[0];
        assert.deepEqual(pingArg.tags, []);

        resetSlack();
    });

    it('listener() calls model.related() for both authors and tags relations', function () {
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

        const relatedSpy = sinon.spy(function () {
            return {toJSON: () => []};
        });

        const testModel = {
            toJSON: function () {
                return testPost;
            },
            related: relatedSpy
        };

        const pingStub = sinon.stub();
        const resetSlack = slack.__set__('ping', pingStub);
        const listener = slack.__get__('slackListener');

        listener(testModel);

        const calledRelations = relatedSpy.args.map(args => args[0]);
        assert.ok(calledRelations.includes('authors'), 'should request authors relation');
        assert.ok(calledRelations.includes('tags'), 'should request tags relation');

        resetSlack();
    });

    it('testPing() calls ping() with default message', function () {
        const pingStub = sinon.stub();
        const resetSlack = slack.__set__('ping', pingStub);
        const testPing = slack.__get__('slackTestPing');

        testPing();

        sinon.assert.calledOnce(pingStub);
        sinon.assert.calledWith(pingStub, sinon.match.has('message'));

        // Reset slack ping method
        resetSlack();
    });

    describe('ping()', function () {
        let settingsCacheStub;
        let slackReset;
        let makeRequestStub;
        let urlServiceGetUrlForResourceStub;
        const ping = slack.__get__('ping');

        beforeEach(function () {
            urlServiceGetUrlForResourceStub = sinon.stub(urlService.facade, 'getUrlForResource');

            settingsCacheStub = sinon.stub(settingsCache, 'get');

            makeRequestStub = sinon.stub();
            slackReset = slack.__set__('request', makeRequestStub);
            makeRequestStub.resolves();

            sinon.stub(imageLib.blogIcon, 'getIconUrl').returns('http://myblog.com/favicon.ico');

            configUtils.set('url', 'http://myblog.com');
        });

        afterEach(function () {
            slackReset();
        });

        it('makes a request for a post if url is provided', function () {
            let requestUrl;
            let requestData;

            const post = testUtils.DataGenerator.forKnex.createPost({
                slug: 'webhook-test',
                html: `<p>Hello World!</p><p>This is a test post.</p><!--members-only--><p>This is members only content.</p>`
            });
            urlServiceGetUrlForResourceStub
                .withArgs(sinon.match({id: post.id, type: 'posts'}), {absolute: true})
                .returns('http://myblog.com/' + post.slug + '/');

            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            ping(post);

            // assertions
            sinon.assert.calledOnce(makeRequestStub);
            sinon.assert.calledOnce(urlServiceGetUrlForResourceStub);
            sinon.assert.calledWith(settingsCacheStub, 'slack_url');

            requestUrl = makeRequestStub.firstCall.args[0];
            requestData = JSON.parse(makeRequestStub.firstCall.args[1].body);

            assert.equal(requestUrl, slackURL);
            assert.equal(requestData.attachments[0].title, post.title);
            assert.equal(requestData.attachments[0].title_link, 'http://myblog.com/webhook-test/');
            assert.equal(requestData.attachments[0].fields[0].value, 'Hello World!This is a test post.');
            assert(!('author_name' in requestData.attachments[0]));
            assert.equal(requestData.icon_url, 'http://myblog.com/favicon.ico');

            assert.equal(requestData.username, 'Ghost');
            assert.equal(requestData.unfurl_links, true);
        });

        it('makes a request for a message if url is provided', function () {
            let requestUrl;
            let requestData;

            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            ping({message: 'Hi!'});

            // assertions
            sinon.assert.calledOnce(makeRequestStub);
            sinon.assert.notCalled(urlServiceGetUrlForResourceStub);
            sinon.assert.calledWith(settingsCacheStub, 'slack_url');

            requestUrl = makeRequestStub.firstCall.args[0];
            requestData = JSON.parse(makeRequestStub.firstCall.args[1].body);

            assert.equal(requestUrl, slackURL);
            assert.equal(requestData.text, 'Hi!');
            assert.equal(requestData.icon_url, 'http://myblog.com/favicon.ico');
            assert.equal(requestData.username, 'Ghost');
            assert.equal(requestData.unfurl_links, true);
        });

        it('makes a request and errors', async function () {
            loggingStub = sinon.stub(logging, 'error');
            makeRequestStub.rejects();
            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            ping({});

            const wait = ms => new Promise((resolve) => {
                setTimeout(resolve, ms);
            });
            // Bound the poll so a regression fails with a clear assertion
            // below rather than stalling until the suite-wide test timeout.
            const deadline = Date.now() + 1000;
            while (!loggingStub.calledOnce && Date.now() < deadline) {
                await wait(50);
            }
            sinon.assert.calledOnce(makeRequestStub);
            sinon.assert.calledOnce(loggingStub);
        });

        it('does not make a request if post is a page', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({type: 'page'});
            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            ping(post);

            // assertions
            sinon.assert.notCalled(makeRequestStub);
            sinon.assert.calledOnce(urlServiceGetUrlForResourceStub);
            sinon.assert.calledWith(settingsCacheStub, 'slack_url');
        });

        it('does not send webhook for \'welcome\' post', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'welcome'});
            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            ping(post);

            // assertions
            sinon.assert.notCalled(makeRequestStub);
            sinon.assert.calledOnce(urlServiceGetUrlForResourceStub);
            sinon.assert.calledWith(settingsCacheStub, 'slack_url');
        });

        it('handles broken slack settings', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'any'});
            settingsCacheStub.withArgs('slack_url').returns();

            // execute code
            ping(post);

            // assertions
            sinon.assert.notCalled(makeRequestStub);
            sinon.assert.called(urlServiceGetUrlForResourceStub);
            sinon.assert.calledWith(settingsCacheStub, 'slack_url');
        });
    });
});
