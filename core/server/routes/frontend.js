var frontend    = require('../controllers/frontend'),
    config      = require('../config'),
    express     = require('express'),
    utils       = require('../utils'),

    frontendRoutes;

frontendRoutes = function (middleware) {
    var router = express.Router(),
        subdir = config.paths.subdir,
        routeKeywords = config.routeKeywords;

    // ### Admin routes
    router.get(/^\/(logout|signout)\/$/, function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signout/');
    });
    router.get(/^\/signup\/$/, function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signup/');
    });

    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    router.get(/^\/((ghost-admin|admin|wp-admin|dashboard|signin|login)\/?)$/, function (req, res) {
        /*jslint unparam:true*/
        res.redirect(subdir + '/ghost/');
    });

    // password-protected frontend route
    router.get('/' + routeKeywords.private + '/',
        middleware.isPrivateSessionAuth,
        frontend.private
    );
    router.post('/' + routeKeywords.private + '/',
        middleware.isPrivateSessionAuth,
        middleware.spamProtectedPrevention,
        middleware.authenticateProtection,
        frontend.private
    );

    // ### Frontend routes
    router.get('/rss/', frontend.rss);
    router.get('/rss/:page/', frontend.rss);
    router.get('/feed/', function redirect(req, res) {
        /*jshint unused:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, subdir + '/rss/');
    });

    // Tags
    router.get('/' + routeKeywords.tag + '/:slug/rss/', frontend.rss);
    router.get('/' + routeKeywords.tag + '/:slug/rss/:page/', frontend.rss);
    router.get('/' + routeKeywords.tag + '/:slug/' + routeKeywords.page + '/:page/', frontend.tag);
    router.get('/' + routeKeywords.tag + '/:slug/', frontend.tag);

    // Authors
    router.get('/' + routeKeywords.author + '/:slug/rss/', frontend.rss);
    router.get('/' + routeKeywords.author + '/:slug/rss/:page/', frontend.rss);
    router.get('/' + routeKeywords.author + '/:slug/' + routeKeywords.page + '/:page/', frontend.author);
    router.get('/' + routeKeywords.author + '/:slug/', frontend.author);

    // Post Live Preview
    router.get('/' + routeKeywords.preview + '/:uuid', frontend.preview);

    // Default
    router.get('/' + routeKeywords.page + '/:page/', frontend.homepage);
    router.get('/', frontend.homepage);
    router.get('*', frontend.single);

    return router;
};

module.exports = frontendRoutes;
