var express = require('express'),
    config = require('../config'),
    controllers = require('../controllers'),
    channelService = require('../services/channels/'),
    appRouter = require('../services/route').appRouter,
    utils = require('../utils');

module.exports = function siteRouter() {
    var router = express.Router(),
        routeKeywords = config.get('routeKeywords');

    // Preview - register controller as route
    router.get(utils.url.urlJoin('/', routeKeywords.preview, ':uuid', ':options?'), controllers.preview);

    // Channels - register sub-router
    router.use(channelService.router());

    // Apps - register sub-router
    router.use(appRouter.router);

    // Default - register entry controller as route
    router.get('*', controllers.entry);

    return router;
};
