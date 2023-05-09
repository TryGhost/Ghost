const logging = require('@tryghost/logging');

/**
 * @typedef {import('./oembed').ICustomProvider} ICustomProvider
 * @typedef {import('./oembed').IExternalRequest} IExternalRequest
 */

const TWITTER_PATH_REGEX = /\/status\/(\d+)/;

/**
 * @implements ICustomProvider
 */
class TwitterOEmbedProvider {
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
        return url.host === 'twitter.com' && TWITTER_PATH_REGEX.test(url.pathname);
    }

    /**
     * @param {URL} url
     * @param {IExternalRequest} externalRequest
     *
     * @returns {Promise<object>}
     */
    async getOEmbedData(url, externalRequest) {
        const [match, tweetId] = url.pathname.match(TWITTER_PATH_REGEX);
        if (!match) {
            return null;
        }

        const {extract} = require('@extractus/oembed-extractor');

        /** @type {object} */
        const oembedData = await extract(url.href);

        if (this.dependencies.config.bearerToken) {
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
                const body = await externalRequest(`https://api.twitter.com/2/tweets/${tweetId}?${queryString}`, {
                    headers: {
                        Authorization: `Bearer ${this.dependencies.config.bearerToken}`
                    }
                }).json();

                oembedData.tweet_data = body.data;
                oembedData.tweet_data.includes = body.includes;
            } catch (err) {
                logging.error(err);
            }
        }

        oembedData.type = 'twitter';

        return oembedData;
    }
}

module.exports = TwitterOEmbedProvider;
