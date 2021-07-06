const debug = require('@tryghost/debug')('routing');
const routing = require('../../../frontend/services/routing');

module.exports = function siteRoutes(options = {}) {
    debug('site Routes', options);
    return routing.bootstrap.init(options);
};
