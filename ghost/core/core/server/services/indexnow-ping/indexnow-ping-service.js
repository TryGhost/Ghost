/**
 * IndexNow Integration Service
 *
 * IndexNow is a protocol that allows websites to notify search engines about
 * content changes for faster indexing. Instead of waiting for crawlers to
 * discover updates, we proactively ping the IndexNow API when posts are
 * published or updated.
 *
 * Protocol: https://www.indexnow.org/documentation
 *
 * How it works:
 * 1. Ghost generates a unique API key (32-char hex string)
 * 2. The key is stored in settings and served at /{key}.txt for verification
 * 3. When a post is published/updated, we send a GET request to IndexNow:
 *    GET https://api.indexnow.org/indexnow?url={post-url}&key={key}&keyLocation={key-file-url}
 * 4. IndexNow distributes the notification to participating search engines
 *    (Bing, Yandex, Seznam.cz, Naver, and others)
 *
 * The API key file is served by the middleware in:
 * ghost/core/core/frontend/web/middleware/serve-indexnow-key.js
 */

const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const {
    messages,
    INDEXNOW_LOG_KEY,
    INDEXNOW_ENDPOINT,
    defaultPostSlugs,
    seoFields
} = require('./constants');

class IndexNowPingService {
    /**
     * @param {object} deps
     * @param {{get: (key: string) => any}} deps.settingsCache
     * @param {{isPrivacyDisabled: (key: string) => boolean}} deps.config
     * @param {{isSet: (flag: string) => boolean}} deps.labs
     * @param {{facade: {getUrlForResource: (resource: object, options: object) => string}}} deps.urlService
     * @param {{urlFor: Function, urlJoin: Function}} deps.urlUtils
     * @param {Function} deps.request
     * @param {object} deps.logging
     * @param {{removeListener: Function, on: Function}} deps.events
     */
    constructor({settingsCache, config, labs, urlService, urlUtils, request, logging, events}) {
        this.settingsCache = settingsCache;
        this.config = config;
        this.labs = labs;
        this.urlService = urlService;
        this.urlUtils = urlUtils;
        this.request = request;
        this.logging = logging;
        this.events = events;

        // Stable reference so removeListener() can de-register it across reboots.
        this.listener = this.handlePostEvent.bind(this);
    }

    /**
     * Get existing API key from settings.
     * The key is auto-generated on boot by the settings service.
     * @returns {string|null} The API key or null if not set
     */
    getApiKey() {
        return this.settingsCache.get('indexnow_api_key') || null;
    }

    /**
     * Check if any SEO-relevant fields have changed.
     * These are fields that affect how the post appears in search results.
     * @param {object} model - The model instance
     * @returns {boolean} True if SEO-relevant content has changed
     */
    hasSeoRelevantChanges(model) {
        return seoFields.some(field => model.get(field) !== model.previous(field));
    }

    /**
     * Ping IndexNow with a URL.
     * @param {object} post - The post object
     */
    async ping(post) {
        // Skip pages - only ping for posts
        if (post.type === 'page') {
            return;
        }

        // Skip if site is private
        if (this.settingsCache.get('is_private')) {
            return;
        }

        // Skip if IndexNow pings are disabled via privacy config
        if (this.config.isPrivacyDisabled('useIndexNow')) {
            return;
        }

        // Skip if IndexNow is not enabled in labs
        if (!this.labs.isSet('indexnow')) {
            return;
        }

        // Don't ping for the default posts
        if (defaultPostSlugs.indexOf(post.slug) > -1) {
            return;
        }

        // Everything from URL resolution onwards sits inside the swallow-and-log
        // envelope: the lazy URL service evaluates collection filters during
        // resolution and can throw, and IndexNow failures must never disrupt
        // publishing.
        let url = null;
        try {
            url = this.urlService.facade.getUrlForResource({...post, type: 'posts'}, {absolute: true});

            if (!url || url.endsWith('/404/')) {
                this.logging.warn({
                    event: {name: 'indexnow.unresolved_url'},
                    post: {id: post.id, slug: post.slug, url}
                }, `${INDEXNOW_LOG_KEY} Skipped ping - post has no resolvable URL`);
                return;
            }

            // Get the API key (auto-generated on boot by settings service)
            const key = this.getApiKey();
            if (!key) {
                this.logging.warn({
                    event: {name: 'indexnow.api_key_missing'},
                    post: {id: post.id, slug: post.slug}
                }, `${INDEXNOW_LOG_KEY} API key not available`);
                return;
            }

            // Get the site URL for the keyLocation parameter
            const siteUrl = this.urlUtils.urlFor('home', true);

            // Build the IndexNow request URL
            const indexNowUrl = new URL(INDEXNOW_ENDPOINT);
            indexNowUrl.searchParams.set('url', url);
            indexNowUrl.searchParams.set('key', key);
            indexNowUrl.searchParams.set('keyLocation', this.urlUtils.urlJoin(siteUrl, `${key}.txt`));

            const response = await this.request(indexNowUrl.toString(), {
                timeout: {
                    request: 5 * 1000 // 5 second timeout
                }
            });

            if (response.statusCode !== 200 && response.statusCode !== 202) {
                throw new errors.InternalServerError({
                    message: `IndexNow returned unexpected status: ${response.statusCode}`,
                    statusCode: response.statusCode
                });
            }

            this.logging.info({
                event: {name: 'indexnow.pinged'},
                post: {id: post.id, slug: post.slug, url},
                http: {response: {status_code: response.statusCode}}
            }, `${INDEXNOW_LOG_KEY} Successfully pinged ${url}`);
        } catch (err) {
            // Log errors but don't throw - IndexNow failures shouldn't disrupt publishing
            const statusCode = err.statusCode ?? err.response?.statusCode ?? null;
            const {eventName, error} = this.#classifyError(statusCode, err);

            this.logging.warn({
                event: {name: eventName},
                post: {id: post.id, slug: post.slug, url},
                http: {response: {status_code: statusCode}},
                err: error
            }, `${INDEXNOW_LOG_KEY} ${error.message}`);
        }
    }

    /**
     * Map an IndexNow response status to a log event name and a structured error.
     * IndexNow-protocol-specific interpretation; when this logic is lifted into a
     * shared ping primitive, this becomes the injected `interpret(status)` hook.
     * @param {number|null} statusCode
     * @param {Error} err
     * @returns {{eventName: string, error: Error}}
     */
    #classifyError(statusCode, err) {
        if (statusCode === 429) {
            // Rate limited by IndexNow - we have no retry/backoff, so the ping is dropped
            return {
                eventName: 'indexnow.rate_limited',
                error: new errors.TooManyRequestsError({
                    err,
                    message: err.message,
                    context: tpl(messages.requestFailedError, {service: 'IndexNow'}),
                    help: tpl(messages.requestFailedHelp, {url: 'https://ghost.org/docs/'})
                })
            };
        }

        if (statusCode === 422 || statusCode === 403) {
            return {
                eventName: 'indexnow.key_validation_failed',
                error: new errors.ValidationError({
                    err,
                    message: 'IndexNow key validation failed',
                    context: tpl(messages.requestFailedError, {service: 'IndexNow'}),
                    help: 'Ensure your IndexNow API key file is accessible at the correct URL'
                })
            };
        }

        return {
            eventName: 'indexnow.ping_failed',
            error: new errors.InternalServerError({
                err,
                message: err.message,
                context: tpl(messages.requestFailedError, {service: 'IndexNow'}),
                help: tpl(messages.requestFailedHelp, {url: 'https://ghost.org/docs/'})
            })
        };
    }

    /**
     * Event listener for post.published / post.published.edited.
     * @param {object} model - The model instance
     * @param {object} options - Event options
     */
    handlePostEvent(model, options) {
        // CASE: do not ping if we import a database
        if (options && options.importing) {
            return;
        }

        // Content-based deduplication: skip if no SEO-relevant fields changed
        // This avoids spamming IndexNow when minor non-content edits are made
        if (!this.hasSeoRelevantChanges(model)) {
            return;
        }

        this.ping({
            ...model.toJSON(),
            // tags and authors are needed so the lazy URL service can evaluate
            // collection filters (e.g. `tag:foo`) when resolving the post URL;
            // without them a tag/author-filtered post resolves to /404/
            authors: model.related('authors').toJSON(),
            tags: model.related('tags').toJSON()
        }).catch(() => {
            // Errors are already logged inside ping()
            // This catch is just to prevent unhandled rejection warnings
        });
    }

    /**
     * Register event listeners for IndexNow.
     */
    subscribeEvents() {
        // Listen for new posts being published
        this.events
            .removeListener('post.published', this.listener)
            .on('post.published', this.listener);

        // Also listen for published posts being edited
        this.events
            .removeListener('post.published.edited', this.listener)
            .on('post.published.edited', this.listener);
    }
}

module.exports = IndexNowPingService;
