const logging = require('@tryghost/logging');

/**
 * @typedef {import('./oembed').ICustomProvider} ICustomProvider
 * @typedef {import('./oembed').IExternalRequest} IExternalRequest
 */

const TWITTER_PATH_REGEX = /\/status\/(\d+)/;

/**
 * @implements ICustomProvider
 */

function mapTweetEntity(tweet) {
    return {
        id: tweet?.id,
        created_at: new Date(tweet?.createdAt),
        text: tweet?.fullText,
        public_metrics: {
            retweet_count: tweet?.retweetCount || 0,
            like_count: tweet?.likeCount || 0,
            reply_count: tweet?.replyCount || 0,
            view_count: tweet?.viewCount || 0
        },
        author_id: tweet?.tweetBy?.id,
        entities: {
            mentions: (tweet?.entities?.mentionedUsers || []).map(user => ({
                start: 0, // Update with actual start index if available
                end: 0, // Update with actual end index if available
                username: user?.userName
            })),
            hashtags: (tweet?.entities?.hashtags || []).map(hashtag => ({
                start: 0, // Update with actual start index if available
                end: 0, // Update with actual end index if available
                tag: hashtag?.tag || hashtag
            })),
            urls: (tweet?.entities?.urls || []).map(url => ({
                start: 0, // Update with actual start index if available
                end: 0, // Update with actual end index if available
                url: url?.url,
                display_url: url?.displayUrl || url?.url,
                expanded_url: url?.expandedUrl || url?.url
            }))
        },
        users: [
            {
                id: tweet?.tweetBy?.id,
                name: tweet?.tweetBy?.fullName,
                username: tweet?.tweetBy?.userName,
                profile_image_url: tweet?.tweetBy?.profileImage,
                description: tweet?.tweetBy?.description,
                verified: tweet?.tweetBy?.isVerified,
                location: tweet?.tweetBy?.location
            }
        ],
        attachments: {
            media_keys: tweet?.media ? tweet?.media.map((_, index) => `media_${index + 1}`) : []
        },
        includes: {
            media: (tweet?.media || []).map((media, index) => ({
                media_key: `media_${index + 1}`,
                type: media?.type,
                url: media?.url,
                preview_image_url: media?.previewUrl || media?.url
            }))
        }
    };
}
class RettiwtOEmbedProvider {
    /**
     * @param {object} dependencies
     */
    constructor(dependencies) {
        this.dependencies = dependencies;
    }

    /**
     * @param {URL} url
     * @returns {Promise<boolean>}
     */
    async canSupportRequest(url) {
        return (url.host === 'twitter.com' || url.host === 'x.com') && TWITTER_PATH_REGEX.test(url.pathname);
    }

    /**
     * @param {URL} url
     *
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
        const query = {
            expansions: ['attachments.poll_ids', 'attachments.media_keys', 'author_id', 'entities.mentions.username', 'geo.place_id', 'in_reply_to_user_id', 'referenced_tweets.id', 'referenced_tweets.id.author_id'],
            'media.fields': ['duration_ms', 'height', 'media_key', 'preview_image_url', 'type', 'url', 'width', 'public_metrics', 'alt_text'],
            'place.fields': ['contained_within', 'country', 'country_code', 'full_name', 'geo', 'id', 'name', 'place_type'],
            'poll.fields': ['duration_minutes', 'end_datetime', 'id', 'options', 'voting_status'],
            'tweet.fields': ['attachments', 'author_id', 'context_annotations', 'conversation_id', 'created_at', 'entities', 'geo', 'id', 'in_reply_to_user_id', 'lang', 'public_metrics', 'possibly_sensitive', 'referenced_tweets', 'reply_settings', 'source', 'text', 'withheld'],
            'user.fields': ['created_at', 'description', 'entities', 'id', 'location', 'name', 'pinned_tweet_id', 'profile_image_url', 'protected', 'public_metrics', 'url', 'username', 'verified', 'withheld']
        };

        const queryString = Object.keys(query).map((key) => {
            return `${key}=${query[key].join(',')}`;
        }).join('&');

        try {
            // const tweet = await .request(EResourceType.TWEET_DETAILS, {id: tweetId, query: queryString});
            const tweet = await this.dependencies.externalRequest.tweet.details(tweetId, queryString);
            oembedData.tweet_data = mapTweetEntity(tweet);
        } catch (err) {
            if (err.response?.body) {
                try {
                    const parsed = JSON.parse(err.response.body);
                    err.context = parsed;
                } catch (e) {
                    err.context = err.response.body;
                }
            }
            logging.error(err);
        }

        oembedData.type = 'twitter';
        return oembedData;
    }
}

module.exports = RettiwtOEmbedProvider;
