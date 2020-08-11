const _ = require('lodash');
const debug = require('ghost-ignition').debug('services:routing:controllers:rss');
const url = require('url');
const security = require('@tryghost/security');
const settingsCache = require('../../../../server/services/settings/cache');
const rssService = require('../../rss');
const helpers = require('../helpers');

// @TODO: is this really correct? Should we be using meta data title?
function getTitle(relatedData) {
    relatedData = relatedData || {};
    let titleStart = _.get(relatedData, 'author[0].name') || _.get(relatedData, 'tag[0].name') || '';

    titleStart += titleStart ? ' - ' : '';
    return titleStart + settingsCache.get('title');
}

/**
 * @description RSS controller.
 *
 * @TODO: The collection controller does almost the same. Merge!
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
module.exports = function rssController(req, res, next) {
    debug('rssController');

    const pathOptions = {
        page: 1, // required for fetchData
        slug: req.params.slug ? security.string.safe(req.params.slug) : undefined
    };

    // CASE: Ghost is using an rss cache - normalize the URL for use as a key
    // @TODO: This belongs to the rss service O_o
    const baseUrl = url.parse(req.originalUrl).pathname;

    helpers.fetchData(pathOptions, res.routerOptions, res.locals)
        .then(function formatResult(result) {
            const response = _.pick(result, ['posts', 'meta']);

            response.title = getTitle(result.data);
            response.description = settingsCache.get('description');

            return response;
        })
        .then(function (data) {
            return rssService.render(res, baseUrl, data);
        })
        .catch(helpers.handleError(next));
};
