var router           = require('./lib/router'),
    registerHelpers = require('./lib/helpers'),

    // Dirty requires
    config = require('../../config'),
    settingsCache = require('../../services/settings/cache');

function ampRouter(req, res) {
    if (settingsCache.get('amp') === true) {
        return router.apply(this, arguments);
    } else {
        var redirectUrl = req.originalUrl.replace(/amp\/$/, '');
        res.redirect(301, redirectUrl);
    }
}

module.exports = {
    activate: function activate(ghost) {
        var ampRoute = '*/' + config.get('routeKeywords').amp + '/';

        ghost.routeService.registerRouter(ampRoute, ampRouter);

        registerHelpers(ghost);
    }
};
