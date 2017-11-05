var _ = require('lodash'),
    url = require('url'),
    utils = require('../utils'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    safeString = require('../utils/index').safeString,
    settingsCache = require('../settings/cache'),

    // Slightly less ugly temporary hack for location of things
    fetchData = require('./frontend/fetch-data'),
    handleError = require('./frontend/error'),

    rssCache = require('../services/rss'),
    generate;

// @TODO: is this the right logic? Where should this live?!
function getBaseUrlForRSSReq(originalUrl, pageParam) {
    return url.parse(originalUrl).pathname.replace(new RegExp('/' + pageParam + '/$'), '/');
}

// @TODO: is this really correct? Should we be using meta data title?
function getTitle(relatedData) {
    relatedData = relatedData || {};
    var titleStart =  _.get(relatedData, 'author[0].name') || _.get(relatedData, 'tag[0].name') || '';

    titleStart += titleStart ? ' - ' : '';
    return  titleStart + settingsCache.get('title');
}

// @TODO: merge this with the rest of the data processing for RSS
// @TODO: swap the fetchData call + duplicate code from channels with something DRY
function getData(channelOpts) {
    channelOpts.data = channelOpts.data || {};

    return fetchData(channelOpts).then(function formatResult(result) {
        var response = {};

        response.title = getTitle(result.data);
        response.description = settingsCache.get('description');
        response.results = {
            posts: result.posts,
            meta: result.meta
        };

        return response;
    });
}

// This here is a controller.
// The "route" is handled in controllers/channels/router.js
// We can only generate RSS for channels, so that sorta makes sense, but the location is rubbish
// @TODO finish refactoring this - it's now a controller
generate = function generate(req, res, next) {
    // Parse the parameters we need from the URL
    var pageParam = req.params.page !== undefined ? req.params.page : 1,
        slugParam = req.params.slug ? safeString(req.params.slug) : undefined;

    // @TODO: fix this, we shouldn't change the channel object!
    // Set page on postOptions for the query made later
    res.locals.channel.postOptions.page = pageParam;
    res.locals.channel.slugParam = slugParam;

    return getData(res.locals.channel).then(function handleResult(data) {
        // Base URL needs to be the URL for the feed without pagination:
        var baseUrl = getBaseUrlForRSSReq(req.originalUrl, pageParam),
            maxPage = data.results.meta.pagination.pages;

        // If page is greater than number of pages we have, redirect to last page
        if (pageParam > maxPage) {
            return next(new errors.NotFoundError({message: i18n.t('errors.errors.pageNotFound')}));
        }

        // Renderer begin
        // Format data
        data.version = res.locals.safeVersion;
        data.siteUrl = utils.url.urlFor('home', {secure: req.secure}, true);
        data.feedUrl = utils.url.urlFor({relativeUrl: baseUrl, secure: req.secure}, true);
        data.secure = req.secure;

        // No context, no template
        // @TODO: should we have context? The context file expects it!

        // Render call - to a different renderer
        // @TODO this is effectively a renderer
        return rssCache.getXML(baseUrl, data).then(function then(feedXml) {
            res.set('Content-Type', 'text/xml; charset=UTF-8');
            res.send(feedXml);
        });
    }).catch(handleError(next));
};

module.exports = generate;
