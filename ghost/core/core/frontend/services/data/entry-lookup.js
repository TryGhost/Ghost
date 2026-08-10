const _ = require('lodash');
const url = require('url');
const debug = require('@tryghost/debug')('services:data:entry-lookup');
const matchPermalinkParams = require('./match-permalink-params');

/**
 * Query API for a single entry/resource.
 * @param {string} postUrl
 * @param {Object} routerOptions
 * @param {Object} locals
 * @param {Object} [lookupOptions]
 * @param {string} [lookupOptions.giftToken] verified by the API read: unlocks
 * gated content, or rejects with `code: 'INVALID_GIFT_TOKEN'`
 * @returns {*}
 */
function entryLookup(postUrl, routerOptions, locals, {giftToken} = {}) {
    debug(postUrl);

    const api = require('../proxy').api;
    const targetPath = url.parse(postUrl).path;
    let isEditURL = false;

    // CASE: e.g. /:slug/ -> { slug: 'value' }
    const params = matchPermalinkParams(routerOptions.permalinks, targetPath);

    debug(targetPath);
    debug(params);
    debug(routerOptions.permalinks);

    // CASE 1: no matches, resolve
    // CASE 2: params can be empty e.g. permalink is /featured/:options(edit)?/ and path is /featured/
    if (params === false || !Object.keys(params).length) {
        return Promise.resolve();
    }

    // CASE: redirect if url contains `/edit/` at the end
    if (params.options && params.options.toLowerCase() === 'edit') {
        isEditURL = true;
    }

    let options = {
        include: 'authors,tags,tiers'
    };

    options.context = {member: locals.member};

    if (giftToken) {
        options.context.giftToken = giftToken;
    }

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
                isUnknownOption: isEditURL ? false : !!params.options
            };
        });
}

module.exports = entryLookup;
