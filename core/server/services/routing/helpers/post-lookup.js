const _ = require('lodash'),
    Promise = require('bluebird'),
    url = require('url'),
    debug = require('ghost-ignition').debug('services:routing:helpers:post-lookup'),
    routeMatch = require('path-match')(),
    api = require('../../../api');

function postLookup(postUrl, routerOptions) {
    debug(postUrl);

    const targetPath = url.parse(postUrl).path,
        permalinks = routerOptions.permalinks;

    let isEditURL = false;

    // CASE: e.g. /:slug/ -> { slug: 'value' }
    const matchFunc = routeMatch(permalinks);
    const params = matchFunc(targetPath);

    debug(params);

    // CASE 1: no matches, resolve
    // CASE 2: params can be empty e.g. permalink is /featured/:options(edit)?/ and path is /featured/
    if (params === false || !Object.keys(params).length) {
        return Promise.resolve();
    }

    // CASE: redirect if url contains `/edit/` at the end
    if (params.options && params.options.toLowerCase() === 'edit') {
        isEditURL = true;
    }

    /**
     * Query database to find post.
     *
     * @deprecated: `author`, will be removed in Ghost 3.0
     */
    return api.posts.read(_.extend(_.pick(params, 'slug', 'id'), {include: 'author,authors,tags'}))
        .then(function then(result) {
            const post = result.posts[0];

            if (!post) {
                return Promise.resolve();
            }

            return {
                post: post,
                isEditURL: isEditURL,
                isUnknownOption: isEditURL ? false : !!params.options
            };
        });
}

module.exports = postLookup;
