const fs = require('fs-extra');
const express = require('express');
const url = require('url');
const path = require('path');
const debug = require('ghost-ignition').debug('web:shared:mw:custom-redirects');
const config = require('../../../config');
const common = require('../../../lib/common');
const validation = require('../../../data/validation');

const _private = {};

let customRedirectsRouter;

_private.registerRoutes = () => {
    debug('redirects loading');

    customRedirectsRouter = express.Router();

    try {
        let redirects = fs.readFileSync(path.join(config.getContentPath('data'), 'redirects.json'), 'utf-8');
        redirects = JSON.parse(redirects);
        validation.validateRedirects(redirects);

        redirects.forEach((redirect) => {
            /**
             * Detect case insensitive modifier when regex is enclosed by
             * / ... /i
             */
            let options = '';
            if (redirect.from.match(/^\/.*\/i$/)) {
                redirect.from = redirect.from.slice(1, -2);
                options = 'i';
            }

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
                redirect.from += '/?$';
            }

            debug('register', redirect.from);
            customRedirectsRouter.get(new RegExp(redirect.from, options), function (req, res) {
                const maxAge = redirect.permanent ? config.get('caching:customRedirects:maxAge') : 0;
                const fromURL = url.parse(req.originalUrl);
                const toURL = url.parse(redirect.to);

                toURL.pathname = fromURL.pathname.replace(new RegExp(redirect.from, options), toURL.pathname),
                toURL.search = fromURL.search;

                res.set({
                    'Cache-Control': `public, max-age=${maxAge}`
                });

                res.redirect(redirect.permanent ? 301 : 302, url.format(toURL));
            });
        });
    } catch (err) {
        if (common.errors.utils.isIgnitionError(err)) {
            common.logging.error(err);
        } else if (err.code !== 'ENOENT') {
            common.logging.error(new common.errors.IncorrectUsageError({
                message: common.i18n.t('errors.middleware.redirects.register'),
                context: err.message,
                help: 'https://docs.ghost.org/concepts/redirects/'
            }));
        }
    }

    debug('redirects loaded');
};

/**
 * - you can extend Ghost with a custom redirects file
 * - see https://github.com/TryGhost/Ghost/issues/7707 and https://docs.ghost.org/concepts/redirects/
 * - file loads synchronously, because we need to register the routes before anything else
 */
exports.use = function use(siteApp) {
    _private.registerRoutes();

    // Recommended approach by express, see https://github.com/expressjs/express/issues/2596#issuecomment-81353034.
    // As soon as the express router get's re-instantiated, the old router instance is not used anymore.
    siteApp.use(function customRedirect(req, res, next) {
        customRedirectsRouter(req, res, next);
    });
};

exports.reload = function reload() {
    _private.registerRoutes();
};
