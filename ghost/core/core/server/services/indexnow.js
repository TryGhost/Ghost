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

const urlService = require('./url');
const urlUtils = require('../../shared/url-utils');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const request = require('@tryghost/request');
const settingsCache = require('../../shared/settings-cache');
const config = require('../../shared/config');
const labs = require('../../shared/labs');
const events = require('../lib/common/events');

const messages = {
    requestFailedError: 'The {service} service was unable to send a ping request, your site will continue to function.',
    requestFailedHelp: 'If you get this error repeatedly, please seek help on {url}.'
};

const INDEXNOW_LOG_KEY = '[indexnow]';

const defaultPostSlugs = [
    'welcome',
    'the-editor',
    'using-tags',
    'managing-users',
    'private-sites',
    'advanced-markdown',
    'themes',
    'coming-soon'
];

// IndexNow endpoint - this routes to all participating search engines
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * Get existing API key from settings
 * The key is auto-generated on boot by the settings service
 * @returns {string|null} The API key or null if not set
 */
function getApiKey() {
    return settingsCache.get('indexnow_api_key') || null;
}

/**
 * Ping IndexNow with a URL
 * @param {Object} post - The post object
 */
async function ping(post) {
    // Skip pages - only ping for posts
    if (post.type === 'page') {
        return;
    }

    // Skip if site is private
    if (settingsCache.get('is_private')) {
        return;
    }

    // Skip if IndexNow pings are disabled via privacy config
    if (config.isPrivacyDisabled('useIndexNow')) {
        return;
    }

    // Skip if IndexNow is not enabled in labs
    if (!labs.isSet('indexnow')) {
        return;
    }

    // Don't ping for the default posts
    if (defaultPostSlugs.indexOf(post.slug) > -1) {
        return;
    }

    let url = null;
    try {
        url = urlService.facade.getUrlForResource({...post, type: 'posts'}, {absolute: true});

        if (!url || url.endsWith('/404/')) {
            logging.warn({
                event: {name: 'indexnow.unresolved_url'},
                post: {id: post.id, slug: post.slug, url}
            }, `${INDEXNOW_LOG_KEY} Skipped ping - post has no resolvable URL`);
            return;
        }

        // Get the API key (auto-generated on boot by settings service)
        const key = getApiKey();
        if (!key) {
            logging.warn({
                event: {name: 'indexnow.api_key_missing'},
                post: {id: post.id, slug: post.slug}
            }, `${INDEXNOW_LOG_KEY} API key not available`);
            return;
        }

        // Get the site URL for the keyLocation parameter
        const siteUrl = urlUtils.urlFor('home', true);

        // Build the IndexNow request URL
        const indexNowUrl = new URL(INDEXNOW_ENDPOINT);
        indexNowUrl.searchParams.set('url', url);
        indexNowUrl.searchParams.set('key', key);
        indexNowUrl.searchParams.set('keyLocation', urlUtils.urlJoin(siteUrl, `${key}.txt`));

        const options = {
            timeout: {
                request: 5 * 1000 // 5 second timeout
            }
        };

        const response = await request(indexNowUrl.toString(), options);

        if (response.statusCode !== 200 && response.statusCode !== 202) {
            throw new errors.InternalServerError({
                message: `IndexNow returned unexpected status: ${response.statusCode}`,
                statusCode: response.statusCode
            });
        }

        logging.info({
            event: {name: 'indexnow.pinged'},
            post: {id: post.id, slug: post.slug, url},
            http: {response: {status_code: response.statusCode}}
        }, `${INDEXNOW_LOG_KEY} Successfully pinged ${url}`);
    } catch (err) {
        // Log errors but don't throw - IndexNow failures shouldn't disrupt publishing
        const statusCode = err.statusCode ?? err.response?.statusCode ?? null;

        let eventName;
        let error;
        if (statusCode === 429) {
            // Rate limited by IndexNow - we have no retry/backoff, so the ping is dropped
            eventName = 'indexnow.rate_limited';
            error = new errors.TooManyRequestsError({
                err,
                message: err.message,
                context: tpl(messages.requestFailedError, {service: 'IndexNow'}),
                help: tpl(messages.requestFailedHelp, {url: 'https://ghost.org/docs/'})
            });
        } else if (statusCode === 422 || statusCode === 403) {
            eventName = 'indexnow.key_validation_failed';
            error = new errors.ValidationError({
                err,
                message: 'IndexNow key validation failed',
                context: tpl(messages.requestFailedError, {service: 'IndexNow'}),
                help: 'Ensure your IndexNow API key file is accessible at the correct URL'
            });
        } else {
            eventName = 'indexnow.ping_failed';
            error = new errors.InternalServerError({
                err: err,
                message: err.message,
                context: tpl(messages.requestFailedError, {service: 'IndexNow'}),
                help: tpl(messages.requestFailedHelp, {url: 'https://ghost.org/docs/'})
            });
        }

        logging.warn({
            event: {name: eventName},
            post: {id: post.id, slug: post.slug, url},
            http: {response: {status_code: statusCode}},
            err: error
        }, `${INDEXNOW_LOG_KEY} ${error.message}`);
    }
}

/**
 * Check if any SEO-relevant fields have changed
 * These are fields that affect how the post appears in search results
 * @param {Object} model - The model instance
 * @returns {boolean} True if SEO-relevant content has changed
 */
function hasSeoRelevantChanges(model) {
    // Fields that affect how the post appears in search engine results
    const seoFields = [
        'html', // Post content
        'title', // Post title (appears in SERP)
        'slug', // URL path
        'meta_title', // Custom meta title
        'meta_description', // Meta description (appears in SERP)
        'canonical_url', // Canonical URL
        'status' // Published status change
    ];

    return seoFields.some(field => model.get(field) !== model.previous(field));
}

/**
 * Event listener for post.published events
 * @param {Object} model - The model instance
 * @param {Object} options - Event options
 */
function indexnowListener(model, options) {
    // CASE: do not ping if we import a database
    if (options && options.importing) {
        return;
    }

    // Content-based deduplication: skip if no SEO-relevant fields changed
    // This avoids spamming IndexNow when minor non-content edits are made
    if (!hasSeoRelevantChanges(model)) {
        return;
    }

    ping(model.toJSON()).catch(() => {
        // Errors are already logged inside ping()
        // This catch is just to prevent unhandled rejection warnings
    });
}

/**
 * Register event listeners for IndexNow
 */
function listen() {
    // Listen for new posts being published
    events
        .removeListener('post.published', indexnowListener)
        .on('post.published', indexnowListener);

    // Also listen for published posts being edited
    events
        .removeListener('post.published.edited', indexnowListener)
        .on('post.published.edited', indexnowListener);
}

module.exports = {
    listen: listen,
    ping: ping,
    getApiKey: getApiKey
};
