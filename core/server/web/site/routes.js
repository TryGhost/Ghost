const debug = require('@tryghost/debug')('routing');
const routing = require('../../../frontend/services/routing');
const routeSettings = require('../../services/route-settings');

module.exports = function siteRoutes(options = {}) {
    debug('site Routes', options);
    options.routerSettings = routeSettings.loadRouteSettingsSync();
    return routing.bootstrap.init(options);
};
