var _ = require('lodash'),

    debug = require('ghost-ignition').debug('url-service'),
    events = require('../../events'),
    URLService = require('./URLService'),
    urlService;

module.exports.init = function init() {
    urlService = new URLService();

    // Hardcoded routes
    // @TODO figure out how to do this from channel or other config
    // @TODO get rid of name concept (for compat with sitemaps)
    urlService.addStatic('/', {name: 'home'});
    // @TODO figure out how to do this from apps
    // @TODO only do this if subscribe is enabled!
    urlService.addStatic('/subscribe/', {});

    // Register a listener for server-start to load all the known urls
    events.on('server:start', function loadAllUrls() {
        debug('URL service, loading all URLS');
        urlService.loadResourceUrls();
    });
};
