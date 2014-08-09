var frontend    = require('../controllers/frontend'),
    config      = require('../config'),
    express     = require('express'),
    utils       = require('../utils'),

    frontendRoutes;

frontendRoutes = function () {
    var router = express.Router(),
        subdir = config.paths.subdir;

    // ### Frontend routes
    router.get('/rss/', frontend.rss);
    router.get('/rss/:page/', frontend.rss);
    router.get('/feed/', function redirect(req, res) {
        /*jshint unused:true*/
        res.set({'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S});
        res.redirect(301, subdir + '/rss/');
    });

    // Tags
    router.get('/tag/:slug/rss/', frontend.rss);
    router.get('/tag/:slug/rss/:page/', frontend.rss);
    router.get('/tag/:slug/page/:page/', frontend.tag);
    router.get('/tag/:slug/', frontend.tag);

    // Authors
    router.get('/author/:slug/rss/', frontend.rss);
    router.get('/author/:slug/rss/:page/', frontend.rss);
    router.get('/author/:slug/page/:page/', frontend.author);
    router.get('/author/:slug/', frontend.author);

    // Default
    router.get('/page/:page/', frontend.homepage);
    router.get('/', frontend.homepage);
    router.get('*', frontend.single);

    return router;
};

module.exports = frontendRoutes;