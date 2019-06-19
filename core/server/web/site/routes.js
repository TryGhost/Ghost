const routing = require('../../../frontend/services/routing');

module.exports = function siteRoutes(options = {}) {
    return routing.bootstrap.init(options);
};
