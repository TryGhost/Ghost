import assert from 'assert/strict';
import {XEmbedProvider} from '../src/XEmbedProvider';

describe('X Embed Providers', function () {
    let dependencies = {
        config: {
            bearerToken: '123'
        },
        _fetcher: async (tweetId: string) => {
            return {
                id_str: tweetId,
                text: 'Hello World',
                created_at: '2021-01-01',
                user: {
                    id_str: '123',
                    name: 'Test User',
                    screen_name: 'testuser',
                    profile_image_url: 'https://test.com/test.jpg'
                },
                retweet_count: 1,
                like_count: 1,
                entities: {
                    user_mentions: [
                        {
                            indices: [0, 5],
                            screen_name: 'testuser'
                        }
                    ],
                    hashtags: [
                        {
                            indices: [0, 5],
                            text: 'test'
                        }
                    ],
                    urls: [
                        {
                            indices: [0, 5],
                            expanded_url: 'https://test.com',
                            display_url: 'test.com'
                        }
                    ]
                },
                attachments: {
                    media_keys: ['123']
                }
            };
        }
    };
    it('Can Initialise XEmbedProvider', function () {
        const xEmbedProvider = new XEmbedProvider(dependencies);
        assert.ok(xEmbedProvider);
    });

    it('Can Initialise XEmbedProvider without Config', function () {
        const xEmbedProvider = new XEmbedProvider(dependencies);
        assert.ok(xEmbedProvider);
    });

    it('Can Support Twitter URL', async function () {
        const xEmbedProvider = new XEmbedProvider(dependencies);
        const tweetURL = new URL('https://twitter.com/status/123');
        const result = await xEmbedProvider.canSupportRequest(tweetURL);
        assert.equal(result, true);
    });

    it ('Can Support X URL', async function () {
        const xEmbedProvider = new XEmbedProvider(dependencies);
        const tweetURL = new URL('https://x.com/status/123');
        const result = await xEmbedProvider.canSupportRequest(tweetURL);
        assert.equal(result, true);
    });

    it ('Cannot Support Invalid URL', async function () {
        const xEmbedProvider = new XEmbedProvider(dependencies);
        const tweetURL = new URL('https://invalid.com/invalid');
        const result = await xEmbedProvider.canSupportRequest(tweetURL);
        assert.equal(result, false);
    });

    it ('Cannot Support Invalid Host', async function () {
        const xEmbedProvider = new XEmbedProvider(dependencies);
        const tweetURL = new URL('https://invalid.com/status/123');
        const result = await xEmbedProvider.canSupportRequest(tweetURL);
        assert.equal(result, false);
    });

    it('can get TweetId', async function () {
        const xEmbedProvider = new XEmbedProvider(dependencies);
        const tweetURL = new URL('https://twitter.com/status/123');
        const result = await xEmbedProvider.getTweetId(tweetURL);
        assert.equal(result, '123');
    });

    it('cannot get TweetId from invalid URL', async function () {
        const xEmbedProvider = new XEmbedProvider(dependencies);
        const tweetURL = new URL('https://twitter.com/invalid');
        assert.rejects(async () => {
            await xEmbedProvider.getTweetId(tweetURL);
        });
    });

    it('can get OEmbedData', async function () {
        const xEmbedProvider = new XEmbedProvider(dependencies);
        const tweetURL = new URL('https://x.com/teslaownersSV/status/1876891406603530610');
        const result = await xEmbedProvider.getOEmbedData(tweetURL);

        assert.equal(result.type, 'rich');
        assert.equal(result.tweet_data.id, '1876891406603530610');
        assert.equal(result.tweet_data.text, 'Hello World');
        assert.equal(result.tweet_data.created_at, '2021-01-01');
    });
});
