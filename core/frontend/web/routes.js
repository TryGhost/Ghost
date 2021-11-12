const debug = require('@tryghost/debug')('routing');

const routing = require('../services/routing');
const urlService = require('../../server/services/url');
const routeSettings = require('../../server/services/route-settings');

module.exports = function siteRoutes(options = {}) {
    debug('site Routes', options);
    options.routerSettings = routeSettings.loadRouteSettingsSync();
    options.urlService = urlService;
    return routing.routerManager.init(options);
};
