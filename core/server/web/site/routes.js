const debug = require('@tryghost/debug')('routing');
const routing = require('../../../frontend/services/routing');
const urlService = require('../../services/url');
const routeSettings = require('../../services/route-settings');

module.exports = function siteRoutes(options = {}) {
    debug('site Routes', options);
    options.routerSettings = routeSettings.loadRouteSettingsSync();
    options.urlService = urlService;
    return routing.routerManager.init(options);
};
