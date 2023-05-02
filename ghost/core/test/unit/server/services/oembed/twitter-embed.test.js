const assert = require('assert');
const TwitterOEmbedProvider = require('../../../../../core/server/services/oembed/TwitterOEmbedProvider');
const externalRequest = require('../../../../../core/server/lib/request-external');
const nock = require('nock');
const {mockManager} = require('../../../../utils/e2e-framework');

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

    it('Can support requests for Tweet URLs', async function () {
        const provider = new TwitterOEmbedProvider();

        const tweetURL = new URL(
            'https://twitter.com/Ghost/status/1630581157568839683'
        );

        const supportsRequest = await provider.canSupportRequest(tweetURL);

        assert(supportsRequest, 'Should support Tweet URL');
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

        // not certain why we hit publish.twitter.com
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
});
