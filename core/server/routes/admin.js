var admin       = require('../controllers/admin'),
    config      = require('../config'),
    express     = require('express'),

    ONE_HOUR_S  = 60 * 60,
    ONE_YEAR_S  = 365 * 24 * ONE_HOUR_S,

    adminRoutes;

adminRoutes = function (middleware) {
    var router = express.Router(),
        subdir = config().paths.subdir;

    // Have ember route look for hits first
    // to prevent conflicts with pre-existing routes
    router.get('/ghost/ember/*', middleware.redirectToSignup, admin.index);

    // ### Admin routes
    router.get('/logout/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signout/');
    });
    router.get('/signout/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signout/');
    });
    router.get('/signin/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signin/');
    });
    router.get('/signup/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signup/');
    });

    router.get('/ghost/signout/', admin.signout);
    router.post('/ghost/signout/', admin.doSignout);
    router.get('/ghost/signin/', middleware.redirectToSignup, middleware.redirectToDashboard, admin.signin);
    router.post('/ghost/signin/', admin.doSignin);
    router.get('/ghost/signup/', middleware.redirectToDashboard, admin.signup);
    router.post('/ghost/signup/', admin.doSignup);
    router.get('/ghost/forgotten/', middleware.redirectToDashboard, admin.forgotten);
    router.post('/ghost/forgotten/', admin.doForgotten);
    router.get('/ghost/reset/:token', admin.reset);
    router.post('/ghost/reset/:token', admin.doReset);

    router.get('/ghost/editor/:id/:action', admin.editor);
    router.get('/ghost/editor/:id/', admin.editor);
    router.get('/ghost/editor/', admin.editor);
    router.get('/ghost/content/', admin.content);
    router.get('/ghost/settings*', admin.settings);
    router.get('/ghost/debug/', admin.debug.index);

    router.get('/ghost/export/', admin.debug.exportContent);

    router.post('/ghost/upload/', middleware.busboy, admin.upload);

    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    router.get(/\/((ghost-admin|admin|wp-admin|dashboard|signin)\/?)$/, function (req, res) {
        /*jslint unparam:true*/
        res.redirect(subdir + '/ghost/');
    });
    router.get(/\/ghost$/, function (req, res) {
        /*jslint unparam:true*/
        res.redirect(subdir + '/ghost/');
    });
    router.get('/ghost/', admin.indexold);

    return router;
};

module.exports = adminRoutes;