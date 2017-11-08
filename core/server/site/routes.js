var express = require('express'),
    config = require('../config'),
    controllers = require('../controllers'),
    channels = require('../controllers/channels'),
    apps = require('../services/route').appRouter,
    utils = require('../utils');

module.exports = function siteRouter() {
    var router = express.Router(),
        routeKeywords = config.get('routeKeywords');

    // Preview - register controller as route
    router.get(utils.url.urlJoin('/', routeKeywords.preview, ':uuid', ':options?'), controllers.preview);

    // Channels - register sub-router
    router.use(channels.router());

    // Apps - register sub-router
    router.use(apps.router);

    // Default - register single controller as route
    router.get('*', controllers.single);

    return router;
};
