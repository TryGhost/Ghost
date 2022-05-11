const _ = require('lodash');
const urlUtils = require('../../shared/url-utils');

function getPaginatedUrl(page, data, absolute) {
    // If we don't have enough information, return null right away
    if (!data || !data.relativeUrl || !data.pagination) {
        return null;
    }

    // routeKeywords.page: 'page'
    const pagePath = urlUtils.urlJoin('/page/');

    // Try to match the base url, as whatever precedes the pagePath
    // routeKeywords.page: 'page'
    const baseUrlPattern = new RegExp('(.+)?(/page/\\d+/)');

    const baseUrlMatch = data.relativeUrl.match(baseUrlPattern);

    // If there is no match for pagePath, use the original url, without the trailing slash
    const baseUrl = baseUrlMatch ? baseUrlMatch[1] : data.relativeUrl.slice(0, -1);

    let newRelativeUrl;

    if (page === 'next' && data.pagination.next) {
        newRelativeUrl = urlUtils.urlJoin(pagePath, data.pagination.next, '/');
    } else if (page === 'prev' && data.pagination.prev) {
        newRelativeUrl = data.pagination.prev > 1 ? urlUtils.urlJoin(pagePath, data.pagination.prev, '/') : '/';
    } else if (_.isNumber(page)) {
        newRelativeUrl = page > 1 ? urlUtils.urlJoin(pagePath, page, '/') : '/';
    } else {
        // If none of the cases match, return null right away
        return null;
    }

    // baseUrl can be undefined, if there was nothing preceding the pagePath (e.g. first page of the index channel)
    newRelativeUrl = baseUrl ? urlUtils.urlJoin(baseUrl, newRelativeUrl) : newRelativeUrl;

    return urlUtils.urlFor({relativeUrl: newRelativeUrl}, absolute);
}

module.exports = getPaginatedUrl;
