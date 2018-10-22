const _ = require('lodash'),
    Promise = require('bluebird'),
    url = require('url'),
    debug = require('ghost-ignition').debug('services:routing:helpers:post-lookup'),
    routeMatch = require('path-match')();

function entryLookup(postUrl, routerOptions, locals) {
    debug(postUrl);

    const api = require('../../../api')[locals.apiVersion];
    const targetPath = url.parse(postUrl).path;
    const permalinks = routerOptions.permalinks;

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

    let resourceType = routerOptions.resourceType;

    // @NOTE: v0.1 does not have a pages controller.
    // @TODO: remove me when we drop v0.1
    if (!api[resourceType]) {
        resourceType = 'posts';
    }

    /**
     * Query database to find entry.
     * @deprecated: `author`, will be removed in Ghost 3.0
     */
    return api[resourceType]
        .read(_.extend(_.pick(params, 'slug', 'id'), {include: 'author,authors,tags'}))
        .then(function then(result) {
            const entry = result[resourceType][0];

            if (!entry) {
                return Promise.resolve();
            }

            return {
                entry: entry,
                isEditURL: isEditURL,
                isUnknownOption: isEditURL ? false : !!params.options
            };
        });
}

module.exports = entryLookup;
