var config     = require('../../config'),
    utils      = require('../../utils'),
    logging    = require('../../logging'),
    i18n       = require('../../i18n'),
    middleware = require('./lib/middleware'),
    router     = require('./lib/router'),
    registerHelpers = require('./lib/helpers');

module.exports = {
    activate: function activate(ghost) {
        var err, paths;

        if (utils.url.getSubdir()) {
            paths = utils.url.getSubdir().split('/');

            if (paths.pop() === config.get('routeKeywords').private) {
                err = new Error();
                err.message = i18n.t('errors.config.urlCannotContainPrivateSubdir.error');
                err.context = i18n.t('errors.config.urlCannotContainPrivateSubdir.description');
                err.help = i18n.t('errors.config.urlCannotContainPrivateSubdir.help');
                logging.error(err);

                // @TODO: why?
                process.exit(0);
            }
        }

        registerHelpers(ghost);
    },

    setupMiddleware: function setupMiddleware(blogApp) {
        blogApp.use(middleware.checkIsPrivate);
        blogApp.use(middleware.filterPrivateRoutes);
    },

    setupRoutes: function setupRoutes(blogRouter) {
        blogRouter.use('/' + config.get('routeKeywords').private + '/', router);
    }
};
