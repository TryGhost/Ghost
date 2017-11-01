var _ = require('lodash'),
    config = require('../../config'),
    utils = require('../../utils');

function getPaginatedUrl(page, data, absolute) {
    // If we don't have enough information, return null right away
    if (!data || !data.relativeUrl || !data.pagination) {
        return null;
    }

    var pagePath = utils.url.urlJoin('/', config.get('routeKeywords').page, '/'),
        // Try to match the base url, as whatever precedes the pagePath
        baseUrlPattern = new RegExp('(.+)?(/' + config.get('routeKeywords').page + '/\\d+/)'),
        baseUrlMatch = data.relativeUrl.match(baseUrlPattern),
        // If there is no match for pagePath, use the original url, without the trailing slash
        baseUrl = baseUrlMatch ? baseUrlMatch[1] : data.relativeUrl.slice(0, -1),
        newRelativeUrl;

    if (page === 'next' && data.pagination.next) {
        newRelativeUrl = utils.url.urlJoin(pagePath, data.pagination.next, '/');
    } else if (page === 'prev' && data.pagination.prev) {
        newRelativeUrl = data.pagination.prev > 1 ? utils.url.urlJoin(pagePath, data.pagination.prev, '/') : '/';
    } else if (_.isNumber(page)) {
        newRelativeUrl = page > 1 ? utils.url.urlJoin(pagePath, page, '/') : '/';
    } else {
        // If none of the cases match, return null right away
        return null;
    }

    // baseUrl can be undefined, if there was nothing preceding the pagePath (e.g. first page of the index channel)
    newRelativeUrl = baseUrl ? utils.url.urlJoin(baseUrl, newRelativeUrl) : newRelativeUrl;

    return utils.url.urlFor({relativeUrl: newRelativeUrl, secure: data.secure}, absolute);
}

module.exports = getPaginatedUrl;
