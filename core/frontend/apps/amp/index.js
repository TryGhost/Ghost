const router = require('./lib/router');
const registerHelpers = require('./lib/helpers');
const urlUtils = require('../../../shared/url-utils');

// Dirty requires
const settingsCache = require('../../../server/services/settings/cache');

function ampRouter(req, res) {
    if (settingsCache.get('amp') === true) {
        return router.apply(this, arguments);
    } else {
        // routeKeywords.amp: 'amp'
        let redirectUrl = req.originalUrl.replace(/\/amp\//, '/');

        urlUtils.redirect301(res, redirectUrl);
    }
}

module.exports = {
    activate: function activate(ghost) {
        // routeKeywords.amp: 'amp'
        let ampRoute = '*/amp/';

        ghost.routeService.registerRouter(ampRoute, ampRouter);

        registerHelpers(ghost);
    }
};
