var frontend    = require('../controllers/frontend'),
    config      = require('../config'),
    express     = require('express'),
    utils       = require('../utils'),

    frontendRoutes;

frontendRoutes = function frontendRoutes(middleware) {
    var router = express.Router(),
        subdir = config.paths.subdir,
        routeKeywords = config.routeKeywords,
        indexRouter = express.Router(),
        tagRouter = express.Router({mergeParams: true}),
        authorRouter = express.Router({mergeParams: true}),
        rssRouter = express.Router({mergeParams: true}),
        privateRouter = express.Router();

    // ### Admin routes
    router.get(/^\/(logout|signout)\/$/, function redirectToSignout(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signout/');
    });
    router.get(/^\/signup\/$/, function redirectToSignup(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signup/');
    });

    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    router.get(/^\/((ghost-admin|admin|wp-admin|dashboard|signin|login)\/?)$/, function redirectToAdmin(req, res) {
        /*jslint unparam:true*/
        res.redirect(subdir + '/ghost/');
    });

    // password-protected frontend route
    privateRouter.route('/')
        .get(
            middleware.privateBlogging.isPrivateSessionAuth,
            frontend.private
        )
        .post(
            middleware.privateBlogging.isPrivateSessionAuth,
            middleware.spamPrevention.protected,
            middleware.privateBlogging.authenticateProtection,
            frontend.private
        );

    rssRouter.route('/rss/').get(frontend.rss);
    rssRouter.route('/rss/:page/').get(frontend.rss);
    rssRouter.route('/feed/').get(function redirect(req, res) {
        /*jshint unused:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, subdir + '/rss/');
    });

    // Index
    indexRouter.route('/').get(frontend.homepage);
    indexRouter.route('/' + routeKeywords.page + '/:page/').get(frontend.homepage);
    indexRouter.use(rssRouter);

    // Tags
    tagRouter.route('/').get(frontend.tag);
    tagRouter.route('/' + routeKeywords.page + '/:page/').get(frontend.tag);
    tagRouter.use(rssRouter);

    // Authors
    authorRouter.route('/').get(frontend.author);
    authorRouter.route('/' + routeKeywords.page + '/:page/').get(frontend.author);
    authorRouter.use(rssRouter);

    // Mount the Routers
    router.use('/' + routeKeywords.private + '/', privateRouter);
    router.use('/' + routeKeywords.author + '/:slug/', authorRouter);
    router.use('/' + routeKeywords.tag + '/:slug/', tagRouter);
    router.use('/', indexRouter);

    // Post Live Preview
    router.get('/' + routeKeywords.preview + '/:uuid', frontend.preview);

    // Default
    router.get('*', frontend.single);

    return router;
};

module.exports = frontendRoutes;
