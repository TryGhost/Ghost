var express = require('express'),
    _       = require('lodash'),
    config  = require('../../config'),
    errors  = require('../../errors'),
    i18n    = require('../../i18n'),
    rss     = require('../../data/xml/rss'),
    utils   = require('../../utils'),
    channelLoader = require('./loader'),
    channelController = require('../channel'),
    rssRouter,
    channelRouter,
    channelsRouter;

function handlePageParam(req, res, next, page) {
    var pageRegex = new RegExp('/' + config.get('routeKeywords').page + '/(.*)?/'),
        rssRegex = new RegExp('/rss/(.*)?/');

    page = parseInt(page, 10);

    if (page === 1) {
        // Page 1 is an alias, do a permanent 301 redirect
        if (rssRegex.test(req.url)) {
            return utils.url.redirect301(res, req.originalUrl.replace(rssRegex, '/rss/'));
        } else {
            return utils.url.redirect301(res, req.originalUrl.replace(pageRegex, '/'));
        }
    } else if (page < 1 || isNaN(page)) {
        // Nothing less than 1 is a valid page number, go straight to a 404
        return next(new errors.NotFoundError({message: i18n.t('errors.errors.pageNotFound')}));
    } else {
        // Set req.params.page to the already parsed number, and continue
        req.params.page = page;
        return next();
    }
}

function rssConfigMiddleware(req, res, next) {
    res.locals.channel.isRSS = true;
    next();
}

function channelConfigMiddleware(channel) {
    return function doChannelConfig(req, res, next) {
        res.locals.channel = _.cloneDeep(channel);
        next();
    };
}

rssRouter = function rssRouter(channelMiddleware) {
    // @TODO move this to an RSS module
    var router = express.Router({mergeParams: true}),
        baseRoute = '/rss/',
        pageRoute = utils.url.urlJoin(baseRoute, ':page(\\d+)/');

    // @TODO figure out how to collapse this into a single rule
    router.get(baseRoute, channelMiddleware, rssConfigMiddleware, rss);
    router.get(pageRoute, channelMiddleware, rssConfigMiddleware, rss);
    // Extra redirect rule
    router.get('/feed/', function redirectToRSS(req, res) {
        return utils.url.redirect301(res, utils.url.urlJoin(utils.url.getSubdir(), req.baseUrl, baseRoute));
    });

    router.param('page', handlePageParam);
    return router;
};

channelRouter = function channelRouter(channel) {
    var channelRouter = express.Router({mergeParams: true}),
        baseRoute = '/',
        pageRoute = utils.url.urlJoin('/', config.get('routeKeywords').page, ':page(\\d+)/'),
        middleware = [channelConfigMiddleware(channel)];

    channelRouter.get(baseRoute, middleware, channelController);

    if (channel.isPaged) {
        channelRouter.param('page', handlePageParam);
        channelRouter.get(pageRoute, middleware, channelController);
    }

    if (channel.hasRSS) {
        channelRouter.use(rssRouter(middleware));
    }

    if (channel.editRedirect) {
        channelRouter.get('/edit/', function redirect(req, res) {
            utils.url.redirectToAdmin(302, res, channel.editRedirect.replace(':slug', req.params.slug));
        });
    }

    return channelRouter;
};

channelsRouter = function channelsRouter() {
    var channelsRouter = express.Router({mergeParams: true});

    _.each(channelLoader.list(), function (channel) {
        // Mount this channel router on the parent channels router
        channelsRouter.use(channel.route, channelRouter(channel));
    });

    return channelsRouter;
};

module.exports = channelsRouter;
