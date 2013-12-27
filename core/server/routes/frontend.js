var frontend    = require('../controllers/frontend'),
    api         = require('../api');
module.exports = function (server) {
    // ### Frontend routes
    /* TODO: dynamic routing, homepage generator, filters ETC ETC */
    server.get('/rss/', frontend.rss);
    server.get('/rss/:page/', frontend.rss);
    server.get('/page/:page/', frontend.homepage);
    server.get('/', frontend.homepage);

    api.settings.read('permalinks').then(function (permalinks) {
        if (permalinks.value !== '/:slug/') {
            server.get('/:slug/', frontend.page);
            server.get(permalinks.value, frontend.post);
        } else {
            server.get(permalinks.value, frontend.single);
        }
    });
};
