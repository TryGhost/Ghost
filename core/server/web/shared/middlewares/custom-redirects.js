const express = require('../../../../shared/express');
const url = require('url');
const querystring = require('querystring');
const debug = require('@tryghost/debug')('web:shared:mw:custom-redirects');
const config = require('../../../../shared/config');
const urlUtils = require('../../../../shared/url-utils');
const errors = require('@tryghost/errors');
const i18n = require('../../../../shared/i18n');
const logging = require('@tryghost/logging');
const redirectsService = require('../../../../frontend/services/redirects');

const _private = {};

let customRedirectsRouter;

_private.registerRoutes = () => {
    debug('redirects loading');

    customRedirectsRouter = express.Router('redirects');

    try {
        const redirects = redirectsService.settings.loadRedirectsFile();

        redirectsService.validation.validate(redirects);

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
                const toURL = url.parse(redirect.to);
                const toURLParams = querystring.parse(toURL.query);
                const currentURL = url.parse(req.url);
                const currentURLParams = querystring.parse(currentURL.query);
                const params = Object.assign({}, currentURLParams, toURLParams);
                const search = querystring.stringify(params);

                toURL.pathname = currentURL.pathname.replace(new RegExp(redirect.from, options), toURL.pathname);
                toURL.search = search !== '' ? `?${search}` : null;

                /**
                 * Only if the URL is internal should we prepend the Ghost subdirectory
                 * @see https://github.com/TryGhost/Ghost/issues/10776
                 */
                if (!toURL.hostname) {
                    toURL.pathname = urlUtils.urlJoin(urlUtils.getSubdir(), toURL.pathname);
                }

                res.set({
                    'Cache-Control': `public, max-age=${maxAge}`
                });

                res.redirect(redirect.permanent ? 301 : 302, url.format(toURL));
            });
        });
    } catch (err) {
        if (errors.utils.isIgnitionError(err)) {
            logging.error(err);
        } else {
            logging.error(new errors.IncorrectUsageError({
                message: i18n.t('errors.middleware.redirects.register'),
                context: err.message,
                help: 'https://ghost.org/docs/themes/routing/#redirects',
                err
            }));
        }
    }

    debug('redirects loaded');
};

/**
 * - you can extend Ghost with a custom redirects file
 * - see https://github.com/TryGhost/Ghost/issues/7707 and https://ghost.org/docs/themes/routing/#redirects
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
