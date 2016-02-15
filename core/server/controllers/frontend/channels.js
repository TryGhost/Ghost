var express = require('express'),
    _       = require('lodash'),
    config  = require('../../config'),
    errors  = require('../../errors'),
    rss     = require('../../data/xml/rss'),
    utils   = require('../../utils'),

    channelConfig = require('./channel-config'),
    renderChannel = require('./render-channel'),

    rssRouter,
    channelRouter;

function handlePageParam(req, res, next, page) {
    var pageRegex = new RegExp('/' + config.routeKeywords.page + '/(.*)?/'),
        rssRegex = new RegExp('/rss/(.*)?/');

    page = parseInt(page, 10);

    if (page === 1) {
        // Page 1 is an alias, do a permanent 301 redirect
        if (rssRegex.test(req.url)) {
            return utils.redirect301(res, req.originalUrl.replace(rssRegex, '/rss/'));
        } else {
            return utils.redirect301(res, req.originalUrl.replace(pageRegex, '/'));
        }
    } else if (page < 1 || isNaN(page)) {
        // Nothing less than 1 is a valid page number, go straight to a 404
        return next(new errors.NotFoundError());
    } else {
        // Set req.params.page to the already parsed number, and continue
        req.params.page = page;
        return next();
    }
}

rssRouter = function rssRouter(channelConfig) {
    function rssConfigMiddleware(req, res, next) {
        req.channelConfig.isRSS = true;
        next();
    }

    // @TODO move this to an RSS module
    var router = express.Router({mergeParams: true}),
        stack = [channelConfig, rssConfigMiddleware, rss],
        baseRoute = '/rss/';

    router.get(baseRoute, stack);
    router.get(baseRoute + ':page/', stack);
    router.get('/feed/', function redirectToRSS(req, res) {
        return utils.redirect301(res, config.paths.subdir + req.baseUrl + baseRoute);
    });
    router.param('page', handlePageParam);

    return router;
};

channelRouter = function router() {
    function channelConfigMiddleware(channel) {
        return function doChannelConfig(req, res, next) {
            req.channelConfig = _.cloneDeep(channel);
            next();
        };
    }

    var channelsRouter = express.Router({mergeParams: true}),
        baseRoute = '/',
        pageRoute = '/' + config.routeKeywords.page + '/:page/';

    _.each(channelConfig.list(), function (channel) {
        var channelRouter = express.Router({mergeParams: true}),
            configChannel = channelConfigMiddleware(channel);

        // @TODO figure out how to collapse this into a single rule
        channelRouter.get(baseRoute, configChannel, renderChannel);
        channelRouter.get(pageRoute, configChannel, renderChannel);
        channelRouter.param('page', handlePageParam);
        channelRouter.use(rssRouter(configChannel));

        if (channel.editRedirect) {
            channelRouter.get('/edit/', function redirect(req, res) {
                res.redirect(config.paths.subdir + channel.editRedirect.replace(':slug', req.params.slug));
            });
        }

        // Mount this channel router on the parent channels router
        channelsRouter.use(channel.route, channelRouter);
    });

    return channelsRouter;
};

module.exports.router = channelRouter;
