var url = require('url'),
    utils = require('../../../utils'),
    errors = require('../../../errors'),
    i18n = require('../../../i18n'),
    safeString = require('../../../utils/index').safeString,
    settingsCache = require('../../../settings/cache'),

    // Really ugly temporary hack for location of things
    fetchData = require('../../../controllers/frontend/fetch-data'),
    handleError = require('../../../controllers/frontend/error'),

    feedCache = require('./cache'),
    generate;

function getData(channelOpts) {
    channelOpts.data = channelOpts.data || {};

    return fetchData(channelOpts).then(function (result) {
        var response = {},
            titleStart = '';

        if (result.data && result.data.tag) { titleStart = result.data.tag[0].name + ' - ' || ''; }
        if (result.data && result.data.author) { titleStart = result.data.author[0].name + ' - ' || ''; }

        response.title = titleStart + settingsCache.get('title');
        response.description = settingsCache.get('description');
        response.results = {
            posts: result.posts,
            meta: result.meta
        };

        return response;
    });
}

// @TODO finish refactoring this - it's now a controller
generate = function generate(req, res, next) {
    // Parse the parameters we need from the URL
    var pageParam = req.params.page !== undefined ? req.params.page : 1,
        slugParam = req.params.slug ? safeString(req.params.slug) : undefined;

    // @TODO: fix this, we shouldn't change the channel object!
    // Set page on postOptions for the query made later
    res.locals.channel.postOptions.page = pageParam;
    res.locals.channel.slugParam = slugParam;

    return getData(res.locals.channel).then(function then(data) {
        // Base URL needs to be the URL for the feed without pagination:
        var baseUrl = url.parse(req.originalUrl).pathname.replace(new RegExp('/' + pageParam + '/$'), '/'),
            maxPage = data.results.meta.pagination.pages;

        // If page is greater than number of pages we have, redirect to last page
        if (pageParam > maxPage) {
            return next(new errors.NotFoundError({message: i18n.t('errors.errors.pageNotFound')}));
        }

        data.version = res.locals.safeVersion;
        data.siteUrl = utils.url.urlFor('home', {secure: req.secure}, true);
        data.feedUrl = utils.url.urlFor({relativeUrl: baseUrl, secure: req.secure}, true);
        data.secure = req.secure;

        // @TODO this is effectively a renderer
        return feedCache.getXML(baseUrl, data).then(function then(feedXml) {
            res.set('Content-Type', 'text/xml; charset=UTF-8');
            res.send(feedXml);
        });
    }).catch(handleError(next));
};

module.exports = generate;
