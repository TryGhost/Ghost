var express = require('express'),
    path = require('path'),
    config = require('../config'),
    controllers = require('../controllers'),
    channels = require('../controllers/channels'),
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

    // setup routes for internal apps
    // @TODO: refactor this to be a proper app route hook for internal & external apps
    config.get('apps:internal').forEach(function (appName) {
        var app = require(path.join(config.get('paths').internalAppPath, appName));
        if (app.hasOwnProperty('setupRoutes')) {
            app.setupRoutes(router);
        }
    });

    // Default
    router.get('*', controllers.single);

    return router;
};
