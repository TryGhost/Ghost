var router           = require('./lib/router'),
    registerHelpers = require('./lib/helpers'),

    // Dirty requires
    config = require('../../config'),
    settingsCache = require('../../settings/cache');

module.exports = {
    activate: function activate(ghost) {
        registerHelpers(ghost);

        ghost.routeService.registerRouter('*/' + config.get('routeKeywords').amp + '/', function settingsEnabledRouter(req, res, next) {
            if (settingsCache.get('amp') === true) {
                return router.apply(this, arguments);
            }

            next();
        });
    }
};
