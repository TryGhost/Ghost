const _ = require('lodash');
const url = require('url');
const debug = require('@tryghost/debug')('services:data:entry-lookup');
const routeMatch = require('path-match')();

/**
 * Query API for a single entry/resource.
 * @param {String} postUrl
 * @param {Object} routerOptions
 * @param {Object} locals
 * @returns {*}
 */
function entryLookup(postUrl, routerOptions, locals) {
    debug(postUrl);

    const api = require('../proxy').api;
    const targetPath = url.parse(postUrl).path;
    const permalinks = routerOptions.permalinks;
    let isEditURL = false;
    let isShareURL = false;

    // CASE: e.g. /:slug/ -> { slug: 'value' }
    const matchFunc = routeMatch(permalinks);
    const params = matchFunc(targetPath);

    debug(targetPath);
    debug(params);
    debug(permalinks);

    // CASE 1: no matches, resolve
    // CASE 2: params can be empty e.g. permalink is /featured/:options(edit|share)?/ and path is /featured/
    if (params === false || !Object.keys(params).length) {
        return Promise.resolve();
    }

    if (params.options) {
        const option = params.options.toLowerCase();

        // CASE: redirect if url contains `/edit/` at the end
        if (option === 'edit') {
            isEditURL = true;
        }

        // CASE: keep `/share/` as a valid entry URL option
        if (option === 'share') {
            isShareURL = true;
        }
    }

    let options = {
        include: 'authors,tags,tiers'
    };

    options.context = {member: locals.member};

    return (api[routerOptions.query.controller] || api[routerOptions.query.resource])
        .read(_.extend(_.pick(params, 'slug', 'id'), options))
        .then(function then(result) {
            const entry = result[routerOptions.query.resource][0];

            if (!entry) {
                return Promise.resolve();
            }

            return {
                entry: entry,
                isEditURL: isEditURL,
                isShareURL: isShareURL,
                isUnknownOption: (isEditURL || isShareURL) ? false : !!params.options
            };
        });
}

module.exports = entryLookup;
