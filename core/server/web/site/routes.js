const debug = require('@tryghost/debug')('routing');
const routing = require('../../../frontend/services/routing');
const frontendSettings = require('../../../frontend/services/settings');

module.exports = function siteRoutes(options = {}) {
    debug('site Routes', options);
    options.routerSettings = frontendSettings.get('routes');
    return routing.bootstrap.init(options);
};
