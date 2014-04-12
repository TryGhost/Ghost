var frontend    = require('../controllers/frontend'),
    config      = require('../config'),
    express     = require('express'),

    ONE_HOUR_S  = 60 * 60,
    ONE_YEAR_S  = 365 * 24 * ONE_HOUR_S,

    frontendRoutes;

frontendRoutes = function () {
    var router = express.Router(),
        subdir = config().paths.subdir;

    // ### Frontend routes
    router.get('/rss/', frontend.rss);
    router.get('/rss/:page/', frontend.rss);
    router.get('/feed/', function redirect(req, res) {
        /*jshint unused:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/rss/');
    });


    router.get('/tag/:slug/rss/', frontend.rss);
    router.get('/tag/:slug/rss/:page/', frontend.rss);
    router.get('/tag/:slug/page/:page/', frontend.tag);
    router.get('/tag/:slug/', frontend.tag);
    router.get('/page/:page/', frontend.homepage);
    router.get('/', frontend.homepage);
    router.get('*', frontend.single);

    return router;
};

module.exports = frontendRoutes;