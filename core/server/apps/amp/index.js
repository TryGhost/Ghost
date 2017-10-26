var router           = require('./lib/router'),
    registerHelpers  = require('./lib/helpers'),
    config           = require('../../config');

module.exports = {
    activate: function activate(ghost) {
        registerHelpers(ghost);
    },

    setupRoutes: function setupRoutes(siteRouter) {
        siteRouter.use('*/' + config.get('routeKeywords').amp + '/', router);
    }
};
