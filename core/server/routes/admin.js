var admin       = require('../controllers/admin'),
    config      = require('../config'),
    express     = require('express'),

    ONE_HOUR_S  = 60 * 60,
    ONE_YEAR_S  = 365 * 24 * ONE_HOUR_S,

    adminRoutes;

adminRoutes = function (middleware) {
    var router = express.Router(),
        subdir = config().paths.subdir;

    // ### Admin routes
    router.get('^/logout/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signout/');
    });
    router.get('^/signout/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signout/');
    });
    router.get('^/signin/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signin/');
    });
    router.get('^/signup/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signup/');
    });

    router.post('/ghost/setup/', admin.doSignup);
    router.post('/ghost/upload/', middleware.busboy, admin.upload);

    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    router.get(/^\/((ghost-admin|admin|wp-admin|dashboard|signin)\/?)$/, function (req, res) {
        /*jslint unparam:true*/
        res.redirect(subdir + '/ghost/');
    });

    router.get('/ghost/*', middleware.redirectToSetup, admin.index);

    return router;
};

module.exports = adminRoutes;