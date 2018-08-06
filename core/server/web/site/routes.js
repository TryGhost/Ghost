const routing = require('../../services/routing');

module.exports = function siteRoutes(options = {}) {
    return routing.bootstrap.init(options);
};
