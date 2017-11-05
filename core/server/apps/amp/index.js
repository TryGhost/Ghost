var router           = require('./lib/router'),
    registerHelpers = require('./lib/helpers'),

    // Dirty requires
    config = require('../../config'),
    settingsCache = require('../../settings/cache');

module.exports = {
    activate: function activate(ghost) {
        var ampRoute = '*/' + config.get('routeKeywords').amp + '/';

        ghost.routeService.registerRouter(ampRoute, function settingsEnabledRouter(req, res, next) {
            if (settingsCache.get('amp') === true) {
                return router.apply(this, arguments);
            }

            next();
        });

        registerHelpers(ghost);
    }
};
