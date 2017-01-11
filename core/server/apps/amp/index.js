var router = require('./lib/router'),
    registerAmpHelpers = require('./lib/helpers'),
    config = require('../../config'),
    ampIsEnabled;

ampIsEnabled = function ampIsEnabled() {
    var ampSettings = config.theme.amp;

    return ampSettings === 'true' ? true : false;
};

module.exports = {
    activate: function activate(ghost) {
        registerAmpHelpers(ghost);
    },

    setupRoutes: function setupRoutes(blogRouter) {
        blogRouter.use('*/' + config.routeKeywords.amp + '/', function ampEnabled(req, res, next) {
            if (ampIsEnabled() === true) {
                return router.apply(this, arguments);
            }

            next();
        });
    }
};
