const debug = require('ghost-ignition').debug('services:url:init'),
    config = require('../../config'),
    events = require('../../events'),
    UrlService = require('./UrlService');

// @TODO we seriously should move this or make it do almost nothing...
module.exports.init = function init() {
    // Temporary config value just in case this causes problems
    // @TODO: delete this
    if (config.get('disableUrlService')) {
        return;
    }

    // Kick off the constructor
    const urlService = new UrlService();

    // Hardcoded routes
    // @TODO figure out how to do this from channel or other config
    // @TODO get rid of name concept (for compat with sitemaps)
    UrlService.cacheRoute('/', {name: 'home'});
    // @TODO figure out how to do this from apps
    // @TODO only do this if subscribe is enabled!
    UrlService.cacheRoute('/subscribe/', {});

    // Register a listener for server-start to load all the known urls
    events.on('server:start', function loadAllUrls() {
        debug('URL service, loading all URLS');
        urlService.loadResourceUrls();
    });
};

// Page events
// events.on('page.published', self.addOrUpdateUrl.bind(self));
// events.on('page.published.edited', self.addOrUpdateUrl.bind(self));
// // Note: This is called if a published page is deleted
// events.on('page.unpublished', self.removeUrl.bind(self));

// Post events
// events.on('post.published', self.addOrUpdateUrl.bind(self));
// events.on('post.published.edited', self.addOrUpdateUrl.bind(self));
// // Note: This is called if a published post is deleted
// events.on('post.unpublished', self.removeUrl.bind(self));
// PERMALINK CHANGE!
// events.on('settings.permalinks.edited', ARGH! Do something to reset all posts!);

// Tag events
// events.on('tag.added', self.addOrUpdateUrl.bind(self));
// events.on('tag.edited', self.addOrUpdateUrl.bind(self));
// events.on('tag.deleted', self.removeUrl.bind(self));

// Author events
// events.on('user.activated', self.addOrUpdateUrl.bind(self));
// events.on('user.activated.edited', self.addOrUpdateUrl.bind(self));
// events.on('user.deactivated', self.removeUrl.bind(self));

