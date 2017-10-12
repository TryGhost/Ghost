var _ = require('lodash'),

    debug = require('ghost-ignition').debug('url-service'),
    events = require('../../events'),
    URLService = require('./URLService'),
    urlService;

module.exports.init = function init() {
    urlService = new URLService();

    // Register a listener for server-start to load all the known urls
    events.on('server:start', function loadAllUrls() {
        debug('URL service, loading all URLS');
        urlService.loadAllUrls();
    });

    // urlService.registerAddEvent('post.published');
    // urlService.registerAddEvent('post.published.edited');
    // urlService.registerRemoveEvent('post.unpublished');
};
