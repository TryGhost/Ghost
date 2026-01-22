const debug = require('@tryghost/debug')('frontend');
const path = require('path');
const express = require('../../shared/express');
const DomainEvents = require('@tryghost/domain-events');
const {MemberPageViewEvent} = require('../../shared/events');

// App requires
const config = require('../../shared/config');
const storage = require('../../server/adapters/storage');
const urlUtils = require('../../shared/url-utils');
const sitemapHandler = require('../services/sitemap/handler');
const serveFavicon = require('./routers/serve-favicon');
const servePublicFiles = require('./routers/serve-public-file');
const themeEngine = require('../services/theme-engine');
const themeMiddleware = themeEngine.middleware;
const membersService = require('../../server/services/members');
const offersService = require('../../server/services/offers');
const customRedirects = require('../../server/services/custom-redirects');
const linkRedirectsHandler = require('./routers/link-redirects');
const siteRoutes = require('./routes');
const shared = require('../../server/web/shared');
const errorHandler = require('@tryghost/mw-error-handler');
const mw = require('./middleware');

const STATIC_IMAGE_URL_PREFIX = `/${urlUtils.STATIC_IMAGE_URL_PREFIX}`;
const STATIC_MEDIA_URL_PREFIX = `/${urlUtils.STATIC_MEDIA_URL_PREFIX}`;
const STATIC_FILES_URL_PREFIX = `/${urlUtils.STATIC_FILES_URL_PREFIX}`;

let router;

function SiteRouter(req, res, next) {
    router(req, res, next);
}

/**
 *
 * @param {import('../services/routing/router-manager').RouterConfig} routerConfig
 * @returns {import('express').Application}
 */
module.exports = function setupSiteApp(routerConfig) {
    debug('Site setup start', routerConfig);

    const siteApp = express('site');

    // ## App - specific code
    // set the view engine
    siteApp.set('view engine', 'hbs');

    // enable CORS headers (allows admin client to hit front-end when configured on separate URLs)
    siteApp.use(mw.cors);

    siteApp.use(offersService.middleware);

    linkRedirectsHandler(siteApp);

    // you can extend Ghost with a custom redirects file
    // see https://github.com/TryGhost/Ghost/issues/7707
    siteApp.use(customRedirects.middleware);

    // (Optionally) redirect any requests to /ghost to the admin panel
    siteApp.use(mw.redirectGhostToAdmin());

    // Static content/assets
    // @TODO make sure all of these have a local 404 error handler
    // Favicon
    serveFavicon(siteApp);

    // Public files (sitemap.xsl, stylesheets, scripts, etc.)
    servePublicFiles(siteApp);

    // Serve site images using the storage adapter
    siteApp.use(STATIC_IMAGE_URL_PREFIX, mw.handleImageSizes, storage.getStorage('images').serve());
    // Serve site media using the storage adapter
    siteApp.use(STATIC_MEDIA_URL_PREFIX, storage.getStorage('media').serve());
    // Serve site files using the storage adapter
    siteApp.use(STATIC_FILES_URL_PREFIX, storage.getStorage('files').serve());

    // /member/.well-known/* serves files (e.g. jwks.json) so it needs to be mounted before the prettyUrl mw to avoid trailing slashes
    siteApp.use(
        '/members/.well-known',
        shared.middleware.cacheControl('public', {maxAge: config.get('caching:wellKnown:maxAge')}),
        function lazyWellKnownMw(req, res, next) {
            return membersService.api.middleware.wellKnown(req, res, next);
        }
    );

    // setup middleware for internal apps
    // @TODO: refactor this to be a proper app middleware hook for internal apps
    config.get('apps:internal').forEach((appName) => {
        const app = require(path.join(config.get('paths').internalAppPath, appName));

        if (Object.prototype.hasOwnProperty.call(app, 'setupMiddleware')) {
            app.setupMiddleware(siteApp);
        }
    });

    // Serve IndexNow API key verification file (/{key}.txt)
    siteApp.use(mw.serveIndexNowKey);

    // Theme static assets/files
    siteApp.use(mw.staticTheme());

    debug('Static content done');

    // site map - this should probably be refactored to be an internal app
    sitemapHandler(siteApp);

    // Global handling for member session, ensures a member is logged in to the frontend
    siteApp.use(membersService.middleware.loadMemberSession);

    // Theme middleware
    // This should happen AFTER any shared assets are served, as it only changes things to do with templates
    siteApp.use(themeMiddleware);
    debug('Themes done');

    debug('Internal apps done');

    // Add in all trailing slashes & remove uppercase
    // must happen AFTER asset loading and BEFORE routing
    siteApp.use(shared.middleware.prettyUrls);

    // ### Caching
    siteApp.use(async function frontendCaching(req, res, next) {
        try {
            const middleware = await mw.frontendCaching.getMiddleware();
            return middleware(req, res, next);
        } catch {
            return next();
        }
    });

    siteApp.use(function memberPageViewMiddleware(req, res, next) {
        if (req.member) {
            // This event needs memberLastSeenAt to avoid doing un-necessary database queries when updating `last_seen_at`
            DomainEvents.dispatch(MemberPageViewEvent.create({url: req.url, memberId: req.member.id, memberLastSeenAt: req.member.last_seen_at}, new Date()));
        }
        next();
    });

    debug('General middleware done');

    // Middleware to set analytics indicator header when analytics tracking is included
    siteApp.use(function ghostAnalyticsHeaderMiddleware(req, res, next) {
        const originalSend = res.send;
        // Has to be on res.send otherwise this executes prior to ghost_head
        res.send = function (data) {
            if (res.locals && (res.locals.ghostAnalytics)) {
                res.set('X-Ghost-Analytics', 'true');
            }
            return originalSend.call(this, data);
        };
        next();
    });

    router = siteRoutes(routerConfig);
    Object.setPrototypeOf(SiteRouter, router);

    // Set up Frontend routes (including private site routes)
    siteApp.use(SiteRouter);

    // ### Error handlers
    siteApp.use(errorHandler.pageNotFound);
    config.get('apps:internal').forEach((appName) => {
        const app = require(path.join(config.get('paths').internalAppPath, appName));

        if (Object.prototype.hasOwnProperty.call(app, 'setupErrorHandling')) {
            app.setupErrorHandling(siteApp);
        }
    });
    siteApp.use(mw.errorHandler.handleThemeResponse);

    debug('Site setup end');

    return siteApp;
};

/**
 * see https://github.com/expressjs/express/issues/2596
 * @param {import('../services/routing/router-manager').RouterConfig} routerConfig
 */
module.exports.reload = (routerConfig) => {
    debug('reloading');
    router = siteRoutes(routerConfig);
    Object.setPrototypeOf(SiteRouter, router);
};
