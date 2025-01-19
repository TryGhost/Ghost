const assert = require('assert/strict');
const sinon = require('sinon');
const XEmbedProvider = require('../../../../../core/server/services/oembed/XEmbedProvider');
const nock = require('nock');
const {ValidationError} = require('@tryghost/errors');

describe('XEmbedProvider', function () {
    let provider;
    let mockDependencies;

    before(function () {
        nock.disableNetConnect();
    });

    beforeEach(function () {
        mockDependencies = {
            _fetchTweetEntity: sinon.stub()
        };
        provider = new XEmbedProvider(mockDependencies);
    });

    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    describe('canSupportRequest', function () {
        it('should support valid Twitter URLs', async function () {
            const url = new URL('https://twitter.com/Ghost/status/1630581157568839683');
            const result = await provider.canSupportRequest(url);
            assert.equal(result, true);
        });

        it('should support valid X.com URLs', async function () {
            const url = new URL('https://x.com/Ghost/status/1630581157568839683');
            const result = await provider.canSupportRequest(url);
            assert.equal(result, true);
        });

        it('should reject unsupported URLs', async function () {
            const url = new URL('https://example.com/some/path');
            const result = await provider.canSupportRequest(url);
            assert.equal(result, false);
        });
    });

    describe('getTweetId', function () {
        it('should extract Tweet ID from valid URL', async function () {
            const url = new URL('https://twitter.com/Ghost/status/1630581157568839683');
            const tweetId = await provider.getTweetId(url);
            assert.equal(tweetId, '1630581157568839683');
        });

        it('should throw ValidationError for invalid URL', async function () {
            const url = new URL('https://twitter.com/Ghost/some/invalid/path');
            await assert.rejects(() => provider.getTweetId(url), ValidationError, 'Invalid URL');
        });
    });

    describe('mapTweetToTweetData', function () {
        it('should map tweet entity correctly', async function () {
            const tweetEntity = {
                id: '12345',
                tweetBy: {
                    id: '67890',
                    fullName: 'Ghost',
                    userName: 'GhostOrg',
                    profileImage: 'https://example.com/profile.jpg'
                },
                retweetCount: 5,
                likeCount: 20,
                fullText: 'This is a test tweet.',
                createdAt: '2024-01-01T12:00:00Z',
                entities: {
                    urls: [{url: 'https://example.com'}],
                    hashtags: [{tag: 'example'}],
                    mentionedUsers: [{username: 'anotherUser'}]
                },
                media: [{url: 'https://example.com/media.jpg'}],
                retweetedTweet: null
            };

            const tweetData = await provider.mapTweetToTweetData(tweetEntity);

            assert.deepEqual(tweetData, {
                id: '12345',
                author_id: '67890',
                public_metrics: {
                    retweet_count: 5,
                    like_count: 20
                },
                users: [{
                    id: '67890',
                    name: 'Ghost',
                    username: 'GhostOrg',
                    profile_image_url: 'https://example.com/profile.jpg'
                }],
                source: 'rettiwt',
                text: 'This is a test tweet.',
                created_at: '2024-01-01T12:00:00.000Z',
                entities: {
                    urls: [{url: 'https://example.com', display_url: 'example.com'}],
                    hashtags: [{tag: 'example'}],
                    mentions: [{username: 'anotherUser'}]
                },
                attachments: {
                    media_keys: ['https://example.com/media.jpg']
                },
                includes: {
                    media: [{url: 'https://example.com/media.jpg'}]
                },
                retweetedTweet: null
            });
        });
    });

    describe('getOEmbedData', function () {
        function nockOembedRequest() {
            nock('https://publish.twitter.com')
                .get('/oembed')
                .query(true)
                .reply(200, {
                    html: '<blockquote>Test embed</blockquote>'
                });
        }

        it('should fetch and map oEmbed data correctly', async function () {
            const tweetURL = new URL('https://twitter.com/Ghost/status/1630581157568839683');

            mockDependencies._fetchTweetEntity.resolves({
                id: '12345',
                tweetBy: {id: '67890', fullName: 'Ghost', userName: 'GhostOrg', profileImage: 'https://example.com/profile.jpg'},
                retweetCount: 5,
                likeCount: 20,
                fullText: 'This is a test tweet.',
                createdAt: '2024-01-01T12:00:00Z',
                entities: {
                    urls: [{url: 'https://example.com'}],
                    hashtags: [{tag: 'example'}],
                    mentionedUsers: [{username: 'anotherUser'}]
                },
                media: [{url: 'https://example.com/media.jpg'}],
                retweetedTweet: null
            });

            nockOembedRequest();

            nock('https://api.twitter.com')
                .get('/2/tweets/1630581157568839683')
                .query(true)
                .reply(200, {
                    data: {id: '1630581157568839683'}
                });

            const oembedData = await provider.getOEmbedData(tweetURL);

            assert.equal(oembedData.type, 'twitter');
            assert.ok(oembedData.html);
            assert.ok(oembedData.tweet_data);
        });
    });
});