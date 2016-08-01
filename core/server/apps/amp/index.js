var router           = require('./lib/router'),
    ampContentHelper = require('./lib/helpers/amp_content'),

    // Dirty requires
    config     = require('../../config');

module.exports = {
    activate: function activate(ghost) {
        // Correct way to register a helper from an app
        ghost.helpers.register('amp_content', function () {
            return ampContentHelper.apply(this, arguments);
        });
    },

    setupRoutes: function setupRoutes(blogRouter) {
        blogRouter.use('*/' + config.routeKeywords.amp + '/', router);
    }
};
