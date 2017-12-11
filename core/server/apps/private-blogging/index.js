var config = require('../../config'),
    urlService = require('../../services/url'),
    common = require('../../lib/common'),
    middleware = require('./lib/middleware'),
    router = require('./lib/router'),
    registerHelpers = require('./lib/helpers'),
    checkSubdir;

checkSubdir = function checkSubdir() {
    var paths;

    if (urlService.utils.getSubdir()) {
        paths = urlService.utils.getSubdir().split('/');

        if (paths.pop() === config.get('routeKeywords').private) {
            common.logging.error(new common.errors.GhostError({
                message: common.i18n.t('errors.config.urlCannotContainPrivateSubdir.error'),
                context: common.i18n.t('errors.config.urlCannotContainPrivateSubdir.description'),
                help: common.i18n.t('errors.config.urlCannotContainPrivateSubdir.help')
            }));

            // @TODO: why
            process.exit(0);
        }
    }
};

module.exports = {
    activate: function activate(ghost) {
        var privateRoute = '/' + config.get('routeKeywords').private + '/';

        checkSubdir();

        ghost.routeService.registerRouter(privateRoute, router);

        registerHelpers(ghost);
    },

    setupMiddleware: function setupMiddleware(siteApp) {
        siteApp.use(middleware.checkIsPrivate);
        siteApp.use(middleware.filterPrivateRoutes);
    }
};
