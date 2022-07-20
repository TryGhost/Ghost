const path = require('path');

const router = require('./lib/router');
const urlUtils = require('../../../shared/url-utils');

// Dirty requires
const settingsCache = require('../../../shared/settings-cache');

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
        ghost.helperService.registerDir(path.resolve(__dirname, './lib/helpers'));
        // we use the {{ghost_head}} helper, but call it {{amp_ghost_head}}, so it's consistent
        ghost.helperService.registerAlias('amp_ghost_head', 'ghost_head');
    }
};
