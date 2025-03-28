const assert = require('assert/strict');
const logging = require('@tryghost/logging');
const sinon = require('sinon');
const TwitterOEmbedProvider = require('../../../../../core/server/services/oembed/TwitterOEmbedProvider');
const externalRequest = require('../../../../../core/server/lib/request-external');
const nock = require('nock');
const {mockManager} = require('../../../../utils/e2e-framework');
const {HTTPError} = require('got');

describe('TwitterOEmbedProvider', function () {
    before(async function () {
        nock.disableNetConnect();
    });

    beforeEach(function () {
        // external requests will attempt dns lookup
        mockManager.disableNetwork();
    });

    afterEach(async function () {
        mockManager.restore();
    });

    function nockOembedRequest() {
        nock('https://publish.twitter.com')
            .get('/oembed')
            .query(true)
            .reply(200, {
                data: {
                    conversation_id: '1630581157568839683',
                    public_metrics: {
                        retweet_count: 6,
                        reply_count: 1,
                        like_count: 27
                    }
                },
                includes: {
                    verified: false,
                    description: 'some description',
                    location: 'someplace, somewhere'
                }
            });
    }

    it('Can support requests for Twitter URLs', async function () {
        const provider = new TwitterOEmbedProvider();
        const tweetURL = new URL(
            'https://twitter.com/Ghost/status/1630581157568839683'
        );

        const supportsRequest = await provider.canSupportRequest(tweetURL);
        assert(supportsRequest, 'Should support Twitter URL');
    });

    it('Can support requests for X.com URLs', async function () {
        const provider = new TwitterOEmbedProvider();
        const tweetURL = new URL(
            'https://x.com/Ghost/status/1630581157568839683'
        );

        const supportsRequest = await provider.canSupportRequest(tweetURL);
        assert(supportsRequest, 'Should support X (Twitter) URL');
    });

    it('Receives JSON from external request to Twitter API', async function () {
        const provider = new TwitterOEmbedProvider({
            config: {
                bearerToken: 'test'
            }
        });
        const tweetURL = new URL(
            'https://twitter.com/Ghost/status/1630581157568839683'
        );

        // oembed-extractor first fetches the main oembed data
        nockOembedRequest();

        // then we fetch additional data from the Twitter API
        nock('https://api.twitter.com')
            .get('/2/tweets/1630581157568839683')
            .query(true)
            .reply(200, {
                data: {
                    conversation_id: '1630581157568839683',
                    public_metrics: {
                        retweet_count: 6,
                        reply_count: 1,
                        like_count: 27
                    }
                },
                includes: {
                    verified: false,
                    description: 'some description',
                    location: 'someplace, somewhere'
                }
            });

        const oembedData = await provider.getOEmbedData(tweetURL, externalRequest);

        assert.equal(oembedData.type, 'twitter');
        assert.ok(oembedData.data);
        assert.ok(oembedData.includes);
    });

    it('logs error with context when external request fails', async function () {
        const provider = new TwitterOEmbedProvider({
            config: {
                bearerToken: 'test'
            }
        });
        const tweetURL = new URL(
            'https://twitter.com/Ghost/status/1630581157568839683'
        );

        nockOembedRequest();

        nock('https://api.twitter.com')
            .get('/2/tweets/1630581157568839683')
            .query(true)
            .reply(403, {
                client_id: '12345',
                detail: 'Testing requests are forbidden!',
                reason: 'thou-shalt-not-pass'
            });

        const loggingStub = sinon.stub(logging, 'error');

        await provider.getOEmbedData(tweetURL, externalRequest);

        sinon.assert.calledOnce(loggingStub);
        sinon.assert.calledWithMatch(loggingStub,
            sinon.match.instanceOf(HTTPError).and(
                sinon.match.has('context', {
                    client_id: '12345',
                    detail: 'Testing requests are forbidden!',
                    reason: 'thou-shalt-not-pass'
                })
            )
        );
    });
});
