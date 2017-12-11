var fs = require('fs-extra'),
    _ = require('lodash'),
    express = require('express'),
    url = require('url'),
    path = require('path'),
    debug = require('ghost-ignition').debug('custom-redirects'),
    config = require('../../config'),
    common = require('../../lib/common'),
    globalUtils = require('../../utils'),
    customRedirectsRouter,
    _private = {};

_private.registerRoutes = function registerRoutes() {
    debug('redirects loading');

    customRedirectsRouter = express.Router();

    try {
        var redirects = fs.readFileSync(path.join(config.getContentPath('data'), 'redirects.json'), 'utf-8');
        redirects = JSON.parse(redirects);
        globalUtils.validateRedirects(redirects);

        _.each(redirects, function (redirect) {
            /**
             * always delete trailing slashes, doesn't matter if regex or not
             * Example:
             *   - you define /my-blog-post-1/ as from property
             *   - /my-blog-post-1 or /my-blog-post-1/ should work
             */
            if (redirect.from.match(/\/$/)) {
                redirect.from = redirect.from.slice(0, -1);
            }

            if (redirect.from[redirect.from.length - 1] !== '$') {
                redirect.from += '\/?$';
            }

            debug('register', redirect.from);
            customRedirectsRouter.get(new RegExp(redirect.from), function (req, res) {
                var maxAge = redirect.permanent ? config.get('caching:customRedirects:maxAge') : 0,
                    parsedUrl = url.parse(req.originalUrl);

                res.set({
                    'Cache-Control': 'public, max-age=' + maxAge
                });

                res.redirect(redirect.permanent ? 301 : 302, url.format({
                    pathname: parsedUrl.pathname.replace(new RegExp(redirect.from), redirect.to),
                    search: parsedUrl.search
                }));
            });
        });
    } catch (err) {
        if (common.errors.utils.isIgnitionError(err)) {
            common.logging.error(err);
        } else if (err.code !== 'ENOENT') {
            common.logging.error(new common.errors.IncorrectUsageError({
                message: common.i18n.t('errors.middleware.redirects.register'),
                context: err.message,
                help: 'https://docs.ghost.org/docs/redirects'
            }));
        }
    }

    debug('redirects loaded');
};

/**
 * - you can extend Ghost with a custom redirects file
 * - see https://github.com/TryGhost/Ghost/issues/7707 and https://docs.ghost.org/v1/docs/redirects
 * - file loads synchronously, because we need to register the routes before anything else
 */
exports.use = function use(siteApp) {
    _private.registerRoutes();

    // Recommended approach by express, see https://github.com/expressjs/express/issues/2596#issuecomment-81353034.
    // As soon as the express router get's re-instantiated, the old router instance is not used anymore.
    siteApp.use(function (req, res, next) {
        customRedirectsRouter(req, res, next);
    });
};

exports.reload = function reload() {
    _private.registerRoutes();
};
