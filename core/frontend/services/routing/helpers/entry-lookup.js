const _ = require('lodash');
const Promise = require('bluebird');
const url = require('url');
const debug = require('ghost-ignition').debug('services:routing:helpers:entry-lookup');
const routeMatch = require('path-match')();

/**
 * @description Query API for a single entry/resource.
 * @param {String} postUrl
 * @param {Object} routerOptions
 * @param {Object} locals
 * @returns {*}
 */
function entryLookup(postUrl, routerOptions, locals) {
    debug(postUrl);

    const api = require('../../../../server/api')[locals.apiVersion];
    const targetPath = url.parse(postUrl).path;
    const permalinks = routerOptions.permalinks;
    let isEditURL = false;

    // CASE: e.g. /:slug/ -> { slug: 'value' }
    const matchFunc = routeMatch(permalinks);
    const params = matchFunc(targetPath);

    debug(targetPath);
    debug(params);
    debug(permalinks);

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
        include: 'authors,tags'
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
                isUnknownOption: isEditURL ? false : !!params.options
            };
        });
}

module.exports = entryLookup;
