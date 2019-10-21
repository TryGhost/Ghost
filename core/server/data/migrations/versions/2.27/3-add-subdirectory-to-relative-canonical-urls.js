const common = require('../../../../lib/common');
const config = require('../../../../config');
const {URL} = require('url');

module.exports.config = {
    transaction: true
};

// We've been incorrectly saving canonical_url fields without a subdirectory.
// We need this column to be consistent with all other relative URLs, so...

// if we have a configured url with a subdirectory
// find all posts that have a canonical_url starting with / but not //
// prefix the subdirectory to the canonical_url and save the post
module.exports.up = (options) => {
    // normalize config url to always have a trailing-slash
    let configUrl = config.get('url');
    if (!configUrl.endsWith('/')) {
        configUrl = `${configUrl}/`;
    }
    const url = new URL(configUrl);

    const localOptions = Object.assign({
        context: {internal: true}
    }, options);

    if (url.pathname === '/') {
        common.logging.info('Skipping posts.canonical_url subdirectory fix: no subdirectory configured');
        return Promise.resolve();
    }

    // perform a specific query for the type of canonical URLs we're looking for
    // so we're not fetching and manually looping over a ton of post models
    return localOptions
        .transacting('posts')
        .where('canonical_url', 'like', '/%')
        .whereNot('canonical_url', 'like', '//%')
        .select().then((posts) => {
            if (posts) {
                return Promise.mapSeries(posts, (post) => {
                    const canonicalUrl = post.canonical_url.replace('/', url.pathname);
                    return localOptions
                        .transacting('posts')
                        .where('id', '=', post.id)
                        .update({
                            canonical_url: canonicalUrl
                        });
                }).then(() => {
                    common.logging.info(`Added subdirectory prefix to canonical_url in ${posts.length} posts`);
                });
            }

            common.logging.info('Skipping posts.canonical_url subdirectory fix: no canonical_urls to fix');
            return Promise.resolve();
        });
};

// if we have a configured url with a subdirectory
// find all posts with a canonical_url starting with the subdirectory
// remove it and save the post
module.exports.down = (options) => {
    // normalize config url to always have a trailing-slash
    let configUrl = config.get('url');
    if (!configUrl.endsWith('/')) {
        configUrl = `${configUrl}/`;
    }
    const url = new URL(configUrl);

    const localOptions = Object.assign({
        context: {internal: true}
    }, options);

    if (url.pathname === '/') {
        common.logging.info('Skipping posts.canonical_url subdirectory fix: no subdirectory configured');
        return Promise.resolve();
    }

    return localOptions
        .transacting('posts')
        .where('canonical_url', 'like', `${url.pathname}%`)
        .select().then((posts) => {
            if (posts) {
                return Promise.mapSeries(posts, (post) => {
                    const canonicalUrl = post.canonical_url.replace(url.pathname, '/');
                    return localOptions
                        .transacting('posts')
                        .where('id', '=', post.id)
                        .update({
                            canonical_url: canonicalUrl
                        });
                }).then(() => {
                    common.logging.info(`Removed subdirectory prefix from canonical_url in ${posts.length} posts`);
                });
            }

            common.logging.info('Skipping posts.canonical_url subdirectory fix: no canonical_urls to fix');
            return Promise.resolve();
        });
};
