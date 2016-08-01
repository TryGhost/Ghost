var express         = require('express'),
    path            = require('path'),
    config          = require('../config'),
    frontend        = require('../controllers/frontend'),
    channels        = require('../controllers/frontend/channels'),
    utils           = require('../utils'),

    frontendRoutes;

frontendRoutes = function frontendRoutes() {
    var router = express.Router(),
        subdir = config.paths.subdir,
        routeKeywords = config.routeKeywords;

    // ### Admin routes
    router.get(/^\/(logout|signout)\/$/, function redirectToSignout(req, res) {
        utils.redirect301(res, subdir + '/ghost/signout/');
    });
    router.get(/^\/signup\/$/, function redirectToSignup(req, res) {
        utils.redirect301(res, subdir + '/ghost/signup/');
    });

    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    router.get(/^\/((ghost-admin|admin|wp-admin|dashboard|signin|login)\/?)$/, function redirectToAdmin(req, res) {
        utils.redirect301(res, subdir + '/ghost/');
    });

    // Post Live Preview
    router.get('/' + routeKeywords.preview + '/:uuid', frontend.preview);

    // Channels
    router.use(channels.router());

    // setup routes for internal apps
    // @TODO: refactor this to be a proper app route hook for internal & external apps
    config.internalApps.forEach(function (appName) {
        var app = require(path.join(config.paths.internalAppPath, appName));
        if (app.hasOwnProperty('setupRoutes')) {
            app.setupRoutes(router);
        }
    });

    // Default
    router.get('*', frontend.single);

    return router;
};

module.exports = frontendRoutes;
