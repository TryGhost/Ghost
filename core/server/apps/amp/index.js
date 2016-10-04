var router           = require('./lib/router'),
    registerHelpers  = require('./lib/helpers'),

    // Dirty requires
    config     = require('../../config');

module.exports = {
    activate: function activate(ghost) {
        registerHelpers(ghost);
    },

    setupRoutes: function setupRoutes(blogRouter) {
        blogRouter.use('*/' + config.get('routeKeywords').amp + '/', router);
    }
};
