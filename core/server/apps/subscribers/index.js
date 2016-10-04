var router     = require('./lib/router'),
    registerHelpers = require('./lib/helpers'),

    // Dirty requires
    config = require('../../config'),
    labs = require('../../utils/labs');

module.exports = {
    activate: function activate(ghost) {
        registerHelpers(ghost);
    },

    setupRoutes: function setupRoutes(blogRouter) {
        blogRouter.use('/' + config.get('routeKeywords').subscribe + '/', function labsEnabledRouter(req, res, next) {
            if (labs.isSet('subscribers') === true) {
                return router.apply(this, arguments);
            }

            next();
        });
    }
};
