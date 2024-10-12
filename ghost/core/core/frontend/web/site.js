const debug = require('@tryghost/debug')('frontend');
const path = require('path');
const express = require('../../shared/express');
const DomainEvents = require('@tryghost/domain-events');
const {MemberPageViewEvent} = require('@tryghost/member-events');

// App requires
const config = require('../../shared/config');
const constants = require('@tryghost/constants');
const storage = require('../../server/adapters/storage');
const urlUtils = require('../../shared/url-utils');
const sitemapHandler = require('../services/sitemap/handler');
const themeEngine = require('../services/theme-engine');
const themeMiddleware = themeEngine.middleware;
const membersService = require('../../server/services/members');
const offersService = require('../../server/services/offers');
const customRedirects = require('../../server/services/custom-redirects');
const linkRedirects = require('../../server/services/link-redirection');
const {cardAssets, commentCountsAssets, memberAttributionAssets} = require('../services/assets-minification');
const siteRoutes = require('./routes');
const shared = require('../../server/web/shared');
const errorHandler = require('@tryghost/mw-error-handler');
const mw = require('./middleware');

const STATIC_IMAGE_URL_PREFIX = `/${urlUtils.STATIC_IMAGE_URL_PREFIX}`;
const STATIC_MEDIA_URL_PREFIX = `/${constants.STATIC_MEDIA_URL_PREFIX}`;
const STATIC_FILES_URL_PREFIX = `/${constants.STATIC_FILES_URL_PREFIX}`;

let router;

function SiteRouter(req, res, next) {
    router(req, res, next);
}

/**
 *
 * @param {import('../services/routing/RouterManager').RouterConfig} routerConfig
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

    siteApp.use(linkRedirects.service.handleRequest);

    // you can extend Ghost with a custom redirects file
    // see https://github.com/TryGhost/Ghost/issues/7707
    siteApp.use(customRedirects.middleware);

    // (Optionally) redirect any requests to /ghost to the admin panel
    siteApp.use(mw.redirectGhostToAdmin());

    // Static content/assets
    // @TODO make sure all of these have a local 404 error handler
    // Favicon
    siteApp.use(mw.serveFavicon());

    // Serve sitemap.xsl file
    siteApp.use(mw.servePublicFile('static', 'sitemap.xsl', 'text/xsl', config.get('caching:sitemapXSL:maxAge')));

    // Serve stylesheets for default templates
    siteApp.use(mw.servePublicFile('static', 'public/ghost.css', 'text/css', config.get('caching:publicAssets:maxAge')));
    siteApp.use(mw.servePublicFile('static', 'public/ghost.min.css', 'text/css', config.get('caching:publicAssets:maxAge')));

    // Card assets
    siteApp.use(cardAssets.serveMiddleware(), mw.servePublicFile('built', 'public/cards.min.css', 'text/css', config.get('caching:publicAssets:maxAge')));
    siteApp.use(cardAssets.serveMiddleware(), mw.servePublicFile('built', 'public/cards.min.js', 'application/javascript', config.get('caching:publicAssets:maxAge')));

    // Comment counts
    siteApp.use(commentCountsAssets.serveMiddleware(), mw.servePublicFile('built', 'public/comment-counts.min.js', 'application/javascript', config.get('caching:publicAssets:maxAge')));

    // Member attribution
    siteApp.use(memberAttributionAssets.serveMiddleware(), mw.servePublicFile('built', 'public/member-attribution.min.js', 'application/javascript', config.get('caching:publicAssets:maxAge')));

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

    // Recommendations well-known
    siteApp.use(mw.servePublicFile('built', '.well-known/recommendations.json', 'application/json', config.get('caching:publicAssets:maxAge'), {disableServerCache: true}));

    // setup middleware for internal apps
    // @TODO: refactor this to be a proper app middleware hook for internal apps
    config.get('apps:internal').forEach((appName) => {
        const app = require(path.join(config.get('paths').internalAppPath, appName));

        if (Object.prototype.hasOwnProperty.call(app, 'setupMiddleware')) {
            app.setupMiddleware(siteApp);
        }
    });

    // Theme static assets/files
    siteApp.use(mw.staticTheme());

    // Serve robots.txt if not found in theme
    siteApp.use(mw.servePublicFile('static', 'robots.txt', 'text/plain', config.get('caching:robotstxt:maxAge')));

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
 * @param {import('../services/routing/RouterManager').RouterConfig} routerConfig
 */
module.exports.reload = (routerConfig) => {
    debug('reloading');
    router = siteRoutes(routerConfig);
    Object.setPrototypeOf(SiteRouter, router);
};
