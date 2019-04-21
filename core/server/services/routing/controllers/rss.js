const _ = require('lodash'),
    debug = require('ghost-ignition').debug('services:routing:controllers:rss'),
    url = require('url'),
    common = require('../../../lib/common'),
    security = require('../../../lib/security'),
    settingsCache = require('../../settings/cache'),
    rssService = require('../../rss'),
    helpers = require('../helpers');

// @TODO: move to services/url/utils
function getBaseUrlForRSSReq(originalUrl, pageParam) {
    return url.parse(originalUrl).pathname.replace(new RegExp('/' + pageParam + '/$'), '/');
}

// @TODO: is this really correct? Should we be using meta data title?
function getTitle(relatedData) {
    relatedData = relatedData || {};
    var titleStart = _.get(relatedData, 'author[0].name') || _.get(relatedData, 'tag[0].name') || '';

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
        page: req.params.page !== undefined ? req.params.page : 1,
        slug: req.params.slug ? security.string.safe(req.params.slug) : undefined
    };

    // CASE: Ghost is using an rss cache - we have to normalise the (without pagination)
    // @TODO: This belongs to the rss service O_o
    const baseUrl = getBaseUrlForRSSReq(req.originalUrl, pathOptions.page);

    helpers.fetchData(pathOptions, res.routerOptions, res.locals)
        .then(function formatResult(result) {
            const response = _.pick(result, ['posts', 'meta']);

            response.title = getTitle(result.data);
            response.description = settingsCache.get('description');

            return response;
        })
        .then(function (data) {
            // CASE: if requested page is greater than number of pages we have
            if (pathOptions.page > data.meta.pagination.pages) {
                return next(new common.errors.NotFoundError({
                    message: common.i18n.t('errors.errors.pageNotFound')
                }));
            }

            return rssService.render(res, baseUrl, data);
        })
        .catch(helpers.handleError(next));
};
