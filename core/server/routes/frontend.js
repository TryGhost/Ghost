var frontend    = require('../controllers/frontend');

module.exports = function (server) {
    // ### Frontend routes
    /* TODO: dynamic routing, homepage generator, filters ETC ETC */
    server.get('/rss/', frontend.rss);
    server.get('/rss/:page/', frontend.rss);
    server.get('/page/:page/', frontend.homepage);
    server.get('/:slug/', frontend.single);
    server.get('/', frontend.homepage);
};