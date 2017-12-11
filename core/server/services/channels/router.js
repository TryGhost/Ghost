var express = require('express'),
    _ = require('lodash'),
    config = require('../../config'),
    common = require('../../lib/common'),
    urlService = require('../../services/url'),
    channelController = require('../../controllers/channel'),
    rssController = require('../../controllers/rss'),
    rssRouter,
    channelRouter;

function handlePageParam(req, res, next, page) {
    var pageRegex = new RegExp('/' + config.get('routeKeywords').page + '/(.*)?/'),
        rssRegex = new RegExp('/rss/(.*)?/');

    page = parseInt(page, 10);

    if (page === 1) {
        // Page 1 is an alias, do a permanent 301 redirect
        if (rssRegex.test(req.url)) {
            return urlService.utils.redirect301(res, req.originalUrl.replace(rssRegex, '/rss/'));
        } else {
            return urlService.utils.redirect301(res, req.originalUrl.replace(pageRegex, '/'));
        }
    } else if (page < 1 || isNaN(page)) {
        // Nothing less than 1 is a valid page number, go straight to a 404
        return next(new common.errors.NotFoundError({message: common.i18n.t('errors.errors.pageNotFound')}));
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
        // @TODO refactor into to something explicit
        res._route = {type: 'channel'};
        next();
    };
}

rssRouter = function rssRouter(channelMiddleware) {
    // @TODO move this to an RSS module
    var router = express.Router({mergeParams: true}),
        baseRoute = '/rss/',
        pageRoute = urlService.utils.urlJoin(baseRoute, ':page(\\d+)/');

    // @TODO figure out how to collapse this into a single rule
    router.get(baseRoute, channelMiddleware, rssConfigMiddleware, rssController);
    router.get(pageRoute, channelMiddleware, rssConfigMiddleware, rssController);
    // Extra redirect rule
    router.get('/feed/', function redirectToRSS(req, res) {
        return urlService.utils.redirect301(res, urlService.utils.urlJoin(urlService.utils.getSubdir(), req.baseUrl, baseRoute));
    });

    router.param('page', handlePageParam);
    return router;
};

channelRouter = function channelRouter(channel) {
    var channelRouter = express.Router({mergeParams: true}),
        baseRoute = '/',
        pageRoute = urlService.utils.urlJoin('/', config.get('routeKeywords').page, ':page(\\d+)/'),
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
            urlService.utils.redirectToAdmin(302, res, channel.editRedirect.replace(':slug', req.params.slug));
        });
    }

    return channelRouter;
};

module.exports = channelRouter;
