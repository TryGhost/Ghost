const urlUtils = require('../../../server/lib/url-utils'),
    common = require('../../../server/lib/common'),
    middleware = require('./lib/middleware'),
    router = require('./lib/router'),
    registerHelpers = require('./lib/helpers'),
    // routeKeywords.private: 'private'
    PRIVATE_KEYWORD = 'private';

let checkSubdir = function checkSubdir() {
    let paths = '';

    if (urlUtils.getSubdir()) {
        paths = urlUtils.getSubdir().split('/');

        if (paths.pop() === PRIVATE_KEYWORD) {
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
        let privateRoute = `/${PRIVATE_KEYWORD}/`;

        checkSubdir();

        ghost.routeService.registerRouter(privateRoute, router);

        registerHelpers(ghost);
    },

    setupMiddleware: function setupMiddleware(siteApp) {
        siteApp.use(middleware.checkIsPrivate);
        siteApp.use(middleware.filterPrivateRoutes);
    }
};
