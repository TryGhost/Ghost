var frontend    = require('../controllers/frontend'),
    config      = require('../config'),

    ONE_HOUR_S  = 60 * 60,
    ONE_YEAR_S  = 365 * 24 * ONE_HOUR_S;

module.exports = function (server) {
    var subdir = config().paths.subdir;

    // ### Frontend routes
    server.get('/rss/', frontend.rss);
    server.get('/rss/:page/', frontend.rss);
    server.get('/feed/', function redirect(req, res) {
        /*jshint unused:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/rss/');
    });


    server.get('/tag/:slug/rss/', frontend.rss);
    server.get('/tag/:slug/rss/:page/', frontend.rss);
    server.get('/tag/:slug/page/:page/', frontend.tag);
    server.get('/tag/:slug/', frontend.tag);
    server.get('/page/:page/', frontend.homepage);
    server.get('/', frontend.homepage);
    server.get('*', frontend.single);


};