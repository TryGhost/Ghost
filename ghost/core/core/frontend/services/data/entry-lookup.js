const _ = require('lodash');
const url = require('url');
const debug = require('@tryghost/debug')('services:data:entry-lookup');
const matchPermalinkParams = require('./match-permalink-params');

/**
 * Query API for a single entry/resource.
 * @param {string} postUrl
 * @param {Object} routerOptions
 * @param {Object} locals
 * @returns {*}
 */
function entryLookup(postUrl, routerOptions, locals) {
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

    // Gift-link access uses the dedicated /g/ router (which calls the API
    // directly with its own context), so `locals.giftLink` is always null on
    // canonical post routes — the null thread-through is kept as a defensive
    // no-op so the forPost serializer never sees a missing context key.
    options.context = {member: locals.member, giftLink: locals.giftLink || null};

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
