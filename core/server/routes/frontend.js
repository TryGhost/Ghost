var frontend    = require('../controllers/frontend'),
    config      = require('../config'),
    errors      = require('../errors'),
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

    function redirect301(res, path) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, path);
    }

    function handlePageParam(req, res, next, page) {
        var pageRegex = new RegExp('/' + routeKeywords.page + '/(.*)?/'),
            rssRegex = new RegExp('/rss/(.*)?/');

        page = parseInt(page, 10);

        if (page === 1) {
            // Page 1 is an alias, do a permanent 301 redirect
            if (rssRegex.test(req.url)) {
                return redirect301(res, req.originalUrl.replace(rssRegex, '/rss/'));
            } else {
                return redirect301(res, req.originalUrl.replace(pageRegex, '/'));
            }
        } else if (page < 1 || isNaN(page)) {
            // Nothing less than 1 is a valid page number, go straight to a 404
            return next(new errors.NotFoundError());
        } else {
            // Set req.params.page to the already parsed number, and continue
            req.params.page = page;
            return next();
        }
    }

    // ### Admin routes
    router.get(/^\/(logout|signout)\/$/, function redirectToSignout(req, res) {
        redirect301(res, subdir + '/ghost/signout/');
    });
    router.get(/^\/signup\/$/, function redirectToSignup(req, res) {
        redirect301(res, subdir + '/ghost/signup/');
    });

    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    router.get(/^\/((ghost-admin|admin|wp-admin|dashboard|signin|login)\/?)$/, function redirectToAdmin(req, res) {
        redirect301(res, subdir + '/ghost/');
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
        redirect301(res, subdir + '/rss/');
    });
    rssRouter.param('page', handlePageParam);

    // Index
    indexRouter.route('/').get(frontend.index);
    indexRouter.route('/' + routeKeywords.page + '/:page/').get(frontend.index);
    indexRouter.param('page', handlePageParam);
    indexRouter.use(rssRouter);

    // Tags
    tagRouter.route('/').get(frontend.tag);
    tagRouter.route('/' + routeKeywords.page + '/:page/').get(frontend.tag);
    tagRouter.route('/edit?').get(function redirect(req, res) {
        res.redirect(subdir + '/ghost/settings/tags/' + req.params.slug + '/');
    });
    tagRouter.param('page', handlePageParam);
    tagRouter.use(rssRouter);

    // Authors
    authorRouter.route('/').get(frontend.author);
    authorRouter.route('/edit?').get(function redirect(req, res) {
        res.redirect(subdir + '/ghost/team/' + req.params.slug + '/');
    });
    authorRouter.route('/' + routeKeywords.page + '/:page/').get(frontend.author);
    authorRouter.param('page', handlePageParam);
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
