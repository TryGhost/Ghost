const debug = require('@tryghost/debug')('routing');
const routing = require('../../../frontend/services/routing');
// NOTE: temporary import from the frontend, will become a backend service soon
const urlService = require('../../../frontend/services/url');
const routeSettings = require('../../services/route-settings');

module.exports = function siteRoutes(options = {}) {
    debug('site Routes', options);
    options.routerSettings = routeSettings.loadRouteSettingsSync();
    options.urlService = urlService;
    return routing.bootstrap.init(options);
};
