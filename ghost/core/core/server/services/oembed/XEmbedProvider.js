const {ValidationError} = require('@tryghost/errors');

const TWITTER_PATH_REGEX = /\/status\/(\d+)/;

/**
 * @typedef {import('./oembed').ICustomProvider} ICustomProvider
 * @typedef {import('./oembed').IExternalRequest} IExternalRequest
 */

/**
 * @implements ICustomProvider
 */
class XEmbedProvider {
    /**
     * @param {object} dependencies
     */
    constructor(dependencies) {
        this._dependencies = dependencies;
    }

    /**
     * Checks if the provided URL can be supported (i.e., if it is a Twitter or X.com URL).
     * @param {URL} url
     * @returns {Promise<boolean>}
     */
    async canSupportRequest(url) {
        return (url.host === 'twitter.com' || url.host === 'x.com') && TWITTER_PATH_REGEX.test(url.pathname);
    }

    /**
     * Extracts the Tweet ID from the given URL.
     * @param {URL} url
     * @returns {Promise<string>}
     * @throws {ValidationError} If the URL is invalid.
     */
    async getTweetId(url) {
        const match = TWITTER_PATH_REGEX.exec(url.pathname);

        if (!match) {
            throw new ValidationError({
                message: 'Invalid URL'
            });
        }

        return match[1];
    }

    // Maps tweet entity in email template compatible format
    async mapTweetToTweetData(tweetEntity) {
        const urls = (tweetEntity.entities?.urls || []).map((url) => {
            return {
                url: url,
                display_url: url.replace(/(^\w+:|^)\/\//, '') // Remove the protocol
            };
        });

        const mentionedUsers = (tweetEntity.entities?.mentionedUsers || []).map((mention) => {
            return {
                username: mention
            };
        });
        const tweetData = {
            id: tweetEntity.id,
            author_id: tweetEntity.tweetBy.id,
            public_metrics: {
                retweet_count: tweetEntity.retweetCount,
                like_count: tweetEntity.likeCount
            },
            users: [{
                id: tweetEntity.tweetBy.id,
                name: tweetEntity.tweetBy.fullName,
                username: tweetEntity.tweetBy.userName,
                profile_image_url: tweetEntity.tweetBy.profileImage
            }],
            text: tweetEntity.fullText,
            created_at: new Date(tweetEntity.createdAt).toISOString(),
            entities: {
                urls: urls,
                hashtags: tweetEntity.entities.hashtags.map((hashtag) => {
                    return {
                        tag: hashtag
                    };
                }),
                mentions: mentionedUsers
            },
            attachments: {
                ...(tweetEntity.media?.length > 0 
                    ? {media_keys: tweetEntity.media.map(media => media.url)} 
                    : {})
            },
            includes: {
                media: tweetEntity.media
            },
            retweetedTweet: tweetEntity.retweetedTweet,
            source: 'rettiwt'
        };

        return tweetData;
    }
    /**
     * @param {URL} url
     */

    /**
     * Fetches the oEmbed data for the given Twitter URL.
     * @param {URL} url
     * @returns {Promise<object>}
     */

    async getOEmbedData(url) {
        if (url.host === 'x.com') { // api is still at twitter.com... also not certain how people are getting x urls because twitter currently redirects every x host to twitter
            url = new URL('https://twitter.com' + url.pathname);
        }

        const [match, tweetId] = url.pathname.match(TWITTER_PATH_REGEX);
        if (!match) {
            return null;
        }
        const {extract} = require('@extractus/oembed-extractor');
        /** @type {object} */
        const oembedData = await extract(url.href);

        const tweetData = await this._dependencies._fetchTweetEntity(tweetId);
        oembedData.tweet_data = await this.mapTweetToTweetData(tweetData);
        oembedData.type = 'twitter';

        return oembedData;
    }
}

module.exports = XEmbedProvider;
