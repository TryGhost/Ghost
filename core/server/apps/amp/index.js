var router           = require('./lib/router'),
    registerAmpHelpers  = require('./lib/helpers'),

    // Dirty requires
    config     = require('../../config');

module.exports = {
    activate: function activate(ghost) {
        registerAmpHelpers(ghost);
    },

    setupRoutes: function setupRoutes(blogRouter) {
        blogRouter.use('*/' + config.routeKeywords.amp + '/', router);
    }
};
