var frontend    = require('../controllers/frontend');

module.exports = function (server) {
    /*jslint regexp: true */

    // ### Frontend routes
    server.get('/rss/', frontend.rss);
    server.get('/rss/:page/', frontend.rss);
    server.get('/tag/:slug/page/:page/', frontend.tag);
    server.get('/tag/:slug/', frontend.tag);
    server.get('/page/:page/', frontend.homepage);
    server.get('/', frontend.homepage);
    server.get('*', frontend.single);
};