var express         = require('express'),
    path            = require('path'),
    config          = require('../config'),
    frontend        = require('../controllers/frontend'),
    channels        = require('../controllers/frontend/channels'),
    utils           = require('../utils'),

    frontendRoutes;

frontendRoutes = function frontendRoutes() {
    var router = express.Router(),
        routeKeywords = config.get('routeKeywords');

    // ### Admin routes
    router.get(/^\/(logout|signout)\/$/, function redirectToSignout(req, res) {
        utils.redirect301(res, utils.url.urlJoin(utils.url.urlFor('admin'), '#/signout/'));
    });
    router.get(/^\/signup\/$/, function redirectToSignup(req, res) {
        utils.redirect301(res, utils.url.urlJoin(utils.url.urlFor('admin'), '#/signup/'));
    });

    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    router.get(/^\/((ghost-admin|admin|wp-admin|dashboard|signin|login)\/?)$/, function redirectToAdmin(req, res) {
        utils.redirect301(res, utils.url.urlFor('admin'));
    });

    // Post Live Preview
    router.get(utils.url.urlJoin('/', routeKeywords.preview, ':uuid', ':options?'), frontend.preview);

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
    router.get('*', frontend.single);

    return router;
};

module.exports = frontendRoutes;
