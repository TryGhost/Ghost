var _ = require('lodash'),
    url = require('url'),
    common = require('../lib/common'),
    safeString = require('../utils').safeString,
    settingsCache = require('../settings/cache'),

    // Slightly less ugly temporary hack for location of things
    fetchData = require('./frontend/fetch-data'),
    handleError = require('./frontend/error'),

    rssService = require('../services/rss'),
    generate;

// @TODO: is this the right logic? Where should this live?!
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

// @TODO: merge this with the rest of the data processing for RSS
// @TODO: swap the fetchData call + duplicate code from channels with something DRY
function getData(channelOpts) {
    channelOpts.data = channelOpts.data || {};

    return fetchData(channelOpts).then(function formatResult(result) {
        var response = _.pick(result, ['posts', 'meta']);

        response.title = getTitle(result.data);
        response.description = settingsCache.get('description');

        return response;
    });
}

// This here is a controller.
// The "route" is handled in services/channels/router.js
// We can only generate RSS for channels, so that sorta makes sense, but the location is rubbish
// @TODO finish refactoring this - it's now a controller
generate = function generate(req, res, next) {
    // Parse the parameters we need from the URL
    var pageParam = req.params.page !== undefined ? req.params.page : 1,
        slugParam = req.params.slug ? safeString(req.params.slug) : undefined,
        // Base URL needs to be the URL for the feed without pagination:
        baseUrl = getBaseUrlForRSSReq(req.originalUrl, pageParam);

    // @TODO: fix this, we shouldn't change the channel object!
    // Set page on postOptions for the query made later
    res.locals.channel.postOptions.page = pageParam;
    res.locals.channel.slugParam = slugParam;

    return getData(res.locals.channel).then(function handleResult(data) {
        // If page is greater than number of pages we have, go straight to 404
        if (pageParam > data.meta.pagination.pages) {
            return next(new common.errors.NotFoundError({message: common.i18n.t('errors.errors.pageNotFound')}));
        }

        // Render call - to a special RSS renderer
        return rssService.render(res, baseUrl, data);
    }).catch(handleError(next));
};

module.exports = generate;
