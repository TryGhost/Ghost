const path = require('path');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');
const middleware = require('./lib/middleware');
const router = require('./lib/router');

const messages = {
    urlCannotContainPrivateSubdir: {
        error: 'private subdirectory not allowed',
        description: 'Your site url in config.js cannot contain a subdirectory called private.',
        help: 'Please rename the subdirectory before restarting'
    }
};

// routeKeywords.private: 'private'
const PRIVATE_KEYWORD = 'private';

let checkSubdir = function checkSubdir() {
    let paths = '';

    if (urlUtils.getSubdir()) {
        paths = urlUtils.getSubdir().split('/');

        if (paths.pop() === PRIVATE_KEYWORD) {
            logging.error(new errors.InternalServerError({
                message: tpl(messages.urlCannotContainPrivateSubdir.error),
                context: tpl(messages.urlCannotContainPrivateSubdir.description),
                help: tpl(messages.urlCannotContainPrivateSubdir.help)
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
        ghost.helperService.registerDir(path.resolve(__dirname, './lib/helpers'));
    },

    setupMiddleware: function setupMiddleware(siteApp) {
        siteApp.use(middleware.checkIsPrivate);
        siteApp.use(middleware.filterPrivateRoutes);
    },

    setupErrorHandling: function setupErrorHandling(siteApp) {
        siteApp.use(middleware.handle404);
    }
};
