const logging = require('@tryghost/logging');
const {FetcherService, EResourceType, Rettiwt} = require('rettiwt-api');
const {id} = require('../../../shared/SentryKnexTracingIntegration');

/**
 * @typedef {import('./oembed').ICustomProvider} ICustomProvider
 * @typedef {import('./oembed').IExternalRequest} IExternalRequest
 */

const TWITTER_PATH_REGEX = /\/status\/(\d+)/;

function mapTweetDetails(rettiwtTweet) {
    return {
        edit_history_tweet_ids: [rettiwtTweet.id],
        referenced_tweets: rettiwtTweet.replyTo
            ? [{type: 'replied_to', id: rettiwtTweet.replyTo}]
            : undefined,
        author_id: rettiwtTweet.tweetBy.id,
        created_at: new Date(rettiwtTweet.createdAt).toISOString(),
        in_reply_to_user_id: rettiwtTweet.replyTo ? rettiwtTweet.tweetBy.id : undefined,
        text: rettiwtTweet.fullText,
        reply_settings: 'everyone', // Default value as per the original structure
        conversation_id: rettiwtTweet.replyTo || rettiwtTweet.id,
        possibly_sensitive: false, // Default value as it's not in the rettiwt object
        lang: rettiwtTweet.lang,
        entities: {
            mentions: rettiwtTweet.entities.mentions || []
        },
        context_annotations: [], // Placeholder, as context annotations are not provided in rettiwt
        id: rettiwtTweet.id,
        public_metrics: {
            retweet_count: rettiwtTweet.retweetCount,
            reply_count: rettiwtTweet.replyCount,
            like_count: rettiwtTweet.likeCount,
            quote_count: rettiwtTweet.quoteCount,
            bookmark_count: rettiwtTweet.bookmarkCount,
            impression_count: rettiwtTweet.viewCount
        },
        includes: {
            users: [
                {
                    id: rettiwtTweet.tweetBy.id,
                    username: rettiwtTweet.tweetBy.username,
                    name: rettiwtTweet.tweetBy.fullName,
                    created_at: rettiwtTweet.tweetBy.createdAt, // Assuming this field exists
                    description: rettiwtTweet.tweetBy.description || '',
                    verified: rettiwtTweet.tweetBy.isVerified || false,
                    profile_image_url: rettiwtTweet.tweetBy.profileImage || ''
                }
            ],
            tweets: [] // Placeholder, as no quoted or retweeted tweets are in rettiwt object
        }
    };
}

/**
 * @implements ICustomProvider
 */
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
     * @param {IExternalRequest} externalRequest
     *
     * @returns {Promise<object>}
     */
    async getOEmbedData(url, externalRequest) {
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
            console.log('fetching tweet data');
            const rettiwt = new Rettiwt();
            const tweet = await rettiwt.tweet.details(tweetId);
            // flatten tweet and set as oembedData.tweet_data
            oembedData.tweet_data = mapTweetDetails(tweet);
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
        console.log('oembedData---', oembedData);
        return oembedData;
    }
}

module.exports = RettiwtOEmbedProvider;
