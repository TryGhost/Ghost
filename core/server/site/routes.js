var express = require('express'),
    config = require('../config'),
    controllers = require('../controllers'),
    channels = require('../controllers/channels'),
    apps = require('../services/route').appRouter,
    utils = require('../utils');

module.exports = function siteRouter() {
    var router = express.Router(),
        routeKeywords = config.get('routeKeywords');

    // ### Admin routes
    router.get(/^\/(logout|signout)\/$/, function (req, res) { return utils.url.redirectToAdmin(301, res, '#/signout/'); });
    router.get(/^\/signup\/$/, function (req, res) { return utils.url.redirectToAdmin(301, res, '#/signup/'); });
    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    router.get(/^\/((ghost-admin|admin|wp-admin|dashboard|signin|login)\/?)$/, function (req, res) { return utils.url.redirectToAdmin(301, res, '/'); });

    // Post Live Preview
    router.get(utils.url.urlJoin('/', routeKeywords.preview, ':uuid', ':options?'), controllers.preview);

    // Channels
    router.use(channels.router());

    // setup routes for apps
    router.use(apps.router);

    // Default
    router.get('*', controllers.single);

    return router;
};
