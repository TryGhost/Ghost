var frontend        = require('../controllers/frontend'),
    channels        = require('../controllers/frontend/channels'),
    config          = require('../config'),
    express         = require('express'),
    utils           = require('../utils'),
    privateBlogging = require('../apps/private-blogging'),

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

    // Default
    router.get('*', frontend.single);

    // @TODO: this can be removed once the proper app route hooks have been set up.
    privateBlogging.setupRoutes(router);

    return router;
};

module.exports = frontendRoutes;
