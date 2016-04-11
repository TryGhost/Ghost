var config     = require('../../config'),
    errors     = require('../../errors'),
    i18n       = require('../../i18n'),
    middleware = require('./lib/middleware'),
    router     = require('./lib/router');

module.exports = {
    activate: function activate() {
        if (config.paths.subdir) {
            var paths = config.paths.subdir.split('/');

            if (paths.pop() === config.routeKeywords.private) {
                errors.logErrorAndExit(
                    new Error(i18n.t('errors.config.urlCannotContainPrivateSubdir.error')),
                    i18n.t('errors.config.urlCannotContainPrivateSubdir.description'),
                    i18n.t('errors.config.urlCannotContainPrivateSubdir.help')
                );
            }
        }
    },

    setupMiddleware: function setupMiddleware(blogApp) {
        blogApp.use(middleware.checkIsPrivate);
        blogApp.use(middleware.filterPrivateRoutes);
    },

    setupRoutes: function setupRoutes(blogRouter) {
        blogRouter.use('/' + config.routeKeywords.private + '/', router);
    }
};
