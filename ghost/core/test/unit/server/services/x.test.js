const assert = require('node:assert/strict');
const sinon = require('sinon');
const _ = require('lodash');
const rewire = require('rewire');
const testUtils = require('../../../utils');

const xService = rewire('../../../../core/server/services/x');

const events = require('../../../../core/server/lib/common/events');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('X service', function () {
    let eventStub;

    beforeEach(function () {
        eventStub = sinon.stub(events, 'on');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('listen() should initialise event correctly', function () {
        xService.listen();

        sinon.assert.calledOnce(eventStub);
        sinon.assert.calledWith(eventStub, 'post.published', xService.__get__('xListener'));
    });

    it('listener() calls publishPost() with toJSONified model', function () {
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
        const testAuthor = _.clone(testUtils.DataGenerator.Content.users[0]);

        const testModel = {
            toJSON() {
                return testPost;
            },
            related(relation) {
                return {
                    toJSON() {
                        if (relation === 'authors') {
                            return [testAuthor];
                        }

                        return [];
                    }
                };
            }
        };

        const publishPostStub = sinon.stub().resolves();
        const resetPublishPost = xService.__set__('publishPost', publishPostStub);

        const listener = xService.__get__('xListener');
        listener(testModel);

        sinon.assert.calledOnce(publishPostStub);
        sinon.assert.calledWith(publishPostStub, {
            ...testPost,
            authors: [testAuthor]
        });

        resetPublishPost();
    });

    it('listener() does not call publishPost() when importing', function () {
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

        const testModel = {
            toJSON() {
                return testPost;
            }
        };

        const publishPostStub = sinon.stub().resolves();
        const resetPublishPost = xService.__set__('publishPost', publishPostStub);

        const listener = xService.__get__('xListener');
        listener(testModel, {importing: true});

        sinon.assert.notCalled(publishPostStub);

        resetPublishPost();
    });

    describe('publishPost()', function () {
        let createTweetStub;
        let resetCreateTweet;
        let settingsCacheStub;
        const publishPost = xService.__get__('publishPost');

        beforeEach(function () {
            createTweetStub = sinon.stub().resolves();
            resetCreateTweet = xService.__set__('createTweet', createTweetStub);
            settingsCacheStub = sinon.stub(settingsCache, 'get');
        });

        afterEach(function () {
            resetCreateTweet();
        });

        it('does not publish pages', async function () {
            const post = testUtils.DataGenerator.forKnex.createPost({type: 'page'});
            settingsCacheStub.withArgs('x_access_token').returns('token');
            settingsCacheStub.withArgs('x_access_token_secret').returns('secret');

            await publishPost(post);

            sinon.assert.notCalled(createTweetStub);
        });

        it('does not publish the welcome post', async function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'welcome'});
            settingsCacheStub.withArgs('x_access_token').returns('token');
            settingsCacheStub.withArgs('x_access_token_secret').returns('secret');

            await publishPost(post);

            sinon.assert.notCalled(createTweetStub);
        });

        it('does not publish when X posting is disabled for the post', async function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'example-post'});
            post.x_post_enabled = false;
            settingsCacheStub.withArgs('x_access_token').returns('token');
            settingsCacheStub.withArgs('x_access_token_secret').returns('secret');

            await publishPost(post);

            sinon.assert.notCalled(createTweetStub);
        });

        it('does not publish when the X integration is not configured', async function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'example-post'});
            settingsCacheStub.withArgs('x_access_token').returns(null);
            settingsCacheStub.withArgs('x_access_token_secret').returns(null);

            await publishPost(post);

            sinon.assert.notCalled(createTweetStub);
        });

        it('publishes eligible posts when the X integration is configured', async function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'example-post'});
            settingsCacheStub.withArgs('x_access_token').returns('token');
            settingsCacheStub.withArgs('x_access_token_secret').returns('secret');

            await publishPost(post);

            sinon.assert.calledOnce(createTweetStub);
            sinon.assert.calledWith(createTweetStub, post);
        });
    });

    describe('getAuthorizationUrl()', function () {
        it('requests an out-of-band callback and stores the request token in session', async function () {
            const requestFormEncodedStub = sinon.stub().resolves({
                oauth_token: 'request-token',
                oauth_token_secret: 'request-token-secret',
                oauth_callback_confirmed: 'true'
            });
            const resetRequestFormEncoded = xService.__set__('requestFormEncoded', requestFormEncodedStub);
            const setSessionPropStub = sinon.stub();

            const authorizationUrl = await xService.getAuthorizationUrl(setSessionPropStub);

            sinon.assert.calledOnceWithExactly(requestFormEncodedStub, {
                url: 'https://api.x.com/oauth/request_token',
                method: 'POST',
                bodyParams: {
                    oauth_callback: 'oob'
                }
            });
            sinon.assert.calledWith(setSessionPropStub, 'x_oauth_token', 'request-token');
            sinon.assert.calledWith(setSessionPropStub, 'x_oauth_token_secret', 'request-token-secret');
            assert.equal(authorizationUrl, 'https://api.x.com/oauth/authorize?oauth_token=request-token');

            resetRequestFormEncoded();
        });
    });

    describe('getAccessTokenData()', function () {
        it('uses the request token stored in session to exchange a verifier for access tokens', async function () {
            const requestFormEncodedStub = sinon.stub().resolves({
                oauth_token: 'access-token',
                oauth_token_secret: 'access-token-secret',
                user_id: '1',
                screen_name: 'ghost'
            });
            const resetRequestFormEncoded = xService.__set__('requestFormEncoded', requestFormEncodedStub);
            const getSessionPropStub = sinon.stub();

            getSessionPropStub.withArgs('x_oauth_token').returns('request-token');
            getSessionPropStub.withArgs('x_oauth_token_secret').returns('request-token-secret');

            const accessTokenData = await xService.getAccessTokenData({
                oauthVerifier: '1234567',
                getSessionProp: getSessionPropStub
            });

            sinon.assert.calledOnceWithExactly(requestFormEncodedStub, {
                url: 'https://api.x.com/oauth/access_token',
                method: 'POST',
                token: 'request-token',
                tokenSecret: 'request-token-secret',
                bodyParams: {
                    oauth_verifier: '1234567'
                }
            });
            assert.equal(accessTokenData.oauth_token, 'access-token');
            assert.equal(accessTokenData.screen_name, 'ghost');

            resetRequestFormEncoded();
        });
    });
});
