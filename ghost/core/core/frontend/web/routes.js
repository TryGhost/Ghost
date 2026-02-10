const debug = require('@tryghost/debug')('frontend:routes');
const routing = require('../services/routing');

/**
 *
 * @param {import('../services/routing/router-manager').RouterConfig} routerConfig
 * @returns {import('express').Router}
 */
module.exports = function siteRoutes(routerConfig) {
    debug('site Routes', routerConfig);
    return routing.routerManager.init(routerConfig);
};
