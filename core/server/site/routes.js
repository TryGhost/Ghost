var express = require('express'),
    config = require('../config'),
    controllers = require('../controllers'),
    channels = require('../controllers/channels'),
    apps = require('../services/route').appRouter,
    utils = require('../utils');

module.exports = function siteRouter() {
    var router = express.Router(),
        routeKeywords = config.get('routeKeywords');

    // Admin redirects - register redirect as route
    // TODO: this should be middleware!
    router.get(/^\/(logout|signout)\/$/, function (req, res) { return utils.url.redirectToAdmin(301, res, '#/signout/'); });
    router.get(/^\/signup\/$/, function (req, res) { return utils.url.redirectToAdmin(301, res, '#/signup/'); });
    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    router.get(/^\/((ghost-admin|admin|wp-admin|dashboard|signin|login)\/?)$/, function (req, res) { return utils.url.redirectToAdmin(301, res, '/'); });

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
