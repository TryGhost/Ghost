const {i18n} = require('../../services/proxy');
const urlUtils = require('../../../shared/url-utils');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const middleware = require('./lib/middleware');
const router = require('./lib/router');
const registerHelpers = require('./lib/helpers');

// routeKeywords.private: 'private'
const PRIVATE_KEYWORD = 'private';

let checkSubdir = function checkSubdir() {
    let paths = '';

    if (urlUtils.getSubdir()) {
        paths = urlUtils.getSubdir().split('/');

        if (paths.pop() === PRIVATE_KEYWORD) {
            logging.error(new errors.GhostError({
                message: i18n.t('errors.config.urlCannotContainPrivateSubdir.error'),
                context: i18n.t('errors.config.urlCannotContainPrivateSubdir.description'),
                help: i18n.t('errors.config.urlCannotContainPrivateSubdir.help')
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
    },

    setupErrorHandling: function setupErrorHandling(siteApp) {
        siteApp.use(middleware.handle404);
    }
};
