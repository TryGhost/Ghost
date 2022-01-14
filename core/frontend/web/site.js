const debug = require('@tryghost/debug')('frontend');
const path = require('path');
const express = require('../../shared/express');
const cors = require('cors');
const {URL} = require('url');
const errors = require('@tryghost/errors');

// App requires
const config = require('../../shared/config');
const constants = require('@tryghost/constants');
const storage = require('../../server/adapters/storage');
const urlService = require('../../server/services/url');
const urlUtils = require('../../shared/url-utils');
const sitemapHandler = require('../services/sitemap/handler');
const appService = require('../services/apps');
const themeEngine = require('../services/theme-engine');
const themeMiddleware = themeEngine.middleware;
const membersService = require('../../server/services/members');
const offersService = require('../../server/services/offers');
const customRedirects = require('../../server/services/redirects');
const siteRoutes = require('./routes');
const shared = require('../../server/web/shared');
const errorHandler = require('@tryghost/mw-error-handler');
const mw = require('./middleware');

const STATIC_IMAGE_URL_PREFIX = `/${urlUtils.STATIC_IMAGE_URL_PREFIX}`;
const STATIC_MEDIA_URL_PREFIX = `/${constants.STATIC_MEDIA_URL_PREFIX}`;
const STATIC_FILES_URL_PREFIX = `/${constants.STATIC_FILES_URL_PREFIX}`;

let router;

const corsOptionsDelegate = function corsOptionsDelegate(req, callback) {
    const origin = req.header('Origin');
    const corsOptions = {
        origin: false, // disallow cross-origin requests by default
        credentials: true // required to allow admin-client to login to private sites
    };

    if (!origin || origin === 'null') {
        return callback(null, corsOptions);
    }

    let originUrl;
    try {
        originUrl = new URL(origin);
    } catch (err) {
        return callback(new errors.BadRequestError({err}));
    }

    // originUrl will definitely exist here because according to WHATWG URL spec
    // The class constructor will either throw a TypeError or return a URL object
    // https://url.spec.whatwg.org/#url-class

    // allow all localhost and 127.0.0.1 requests no matter the port
    if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') {
        corsOptions.origin = true;
    }

    // allow the configured host through on any protocol
    const siteUrl = new URL(config.get('url'));
    if (originUrl.host === siteUrl.host) {
        corsOptions.origin = true;
    }

    // allow the configured admin:url host through on any protocol
    if (config.get('admin:url')) {
        const adminUrl = new URL(config.get('admin:url'));
        if (originUrl.host === adminUrl.host) {
            corsOptions.origin = true;
        }
    }

    callback(null, corsOptions);
};

function SiteRouter(req, res, next) {
    router(req, res, next);
}

module.exports = function setupSiteApp(options = {}) {
    debug('Site setup start', options);

    const siteApp = express('site');

    // ## App - specific code
    // set the view engine
    siteApp.set('view engine', 'hbs');

    // enable CORS headers (allows admin client to hit front-end when configured on separate URLs)
    siteApp.use(cors(corsOptionsDelegate));

    siteApp.use(offersService.middleware);

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
    siteApp.use(mw.servePublicFile('static', 'sitemap.xsl', 'text/xsl', constants.ONE_DAY_S));

    // Serve stylesheets for default templates
    siteApp.use(mw.servePublicFile('static', 'public/ghost.css', 'text/css', constants.ONE_HOUR_S));
    siteApp.use(mw.servePublicFile('static', 'public/ghost.min.css', 'text/css', constants.ONE_YEAR_S));

    // Card assets
    siteApp.use(mw.servePublicFile('built', 'public/cards.min.css', 'text/css', constants.ONE_YEAR_S));
    siteApp.use(mw.servePublicFile('built', 'public/cards.min.js', 'application/javascript', constants.ONE_YEAR_S));

    // Serve blog images using the storage adapter
    siteApp.use(STATIC_IMAGE_URL_PREFIX, mw.handleImageSizes, storage.getStorage('images').serve());
    // Serve blog media using the storage adapter
    siteApp.use(STATIC_MEDIA_URL_PREFIX, storage.getStorage('media').serve());
    // Serve blog files using the storage adapter
    siteApp.use(STATIC_FILES_URL_PREFIX, storage.getStorage('files').serve());

    // Global handling for member session, ensures a member is logged in to the frontend
    siteApp.use(membersService.middleware.loadMemberSession);

    // /member/.well-known/* serves files (e.g. jwks.json) so it needs to be mounted before the prettyUrl mw to avoid trailing slashes
    siteApp.use(
        '/members/.well-known',
        shared.middleware.cacheControl('public', {maxAge: 60 * 60 * 24}),
        (req, res, next) => membersService.api.middleware.wellKnown(req, res, next)
    );

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
    debug('Static content done');

    // Theme middleware
    // This should happen AFTER any shared assets are served, as it only changes things to do with templates
    siteApp.use(themeMiddleware);
    debug('Themes done');

    // Serve robots.txt if not found in theme
    siteApp.use(mw.servePublicFile('static', 'robots.txt', 'text/plain', constants.ONE_HOUR_S));

    // site map - this should probably be refactored to be an internal app
    sitemapHandler(siteApp);
    debug('Internal apps done');

    // Add in all trailing slashes & remove uppercase
    // must happen AFTER asset loading and BEFORE routing
    siteApp.use(shared.middleware.prettyUrls);

    // ### Caching
    siteApp.use(function (req, res, next) {
        // Site frontend is cacheable UNLESS request made by a member or blog is in private mode
        if (req.member || res.isPrivateBlog) {
            return shared.middleware.cacheControl('private')(req, res, next);
        } else {
            return shared.middleware.cacheControl('public', {maxAge: config.get('caching:frontend:maxAge')})(req, res, next);
        }
    });

    debug('General middleware done');

    router = siteRoutes(options);
    Object.setPrototypeOf(SiteRouter, router);

    // Set up Frontend routes (including private blogging routes)
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

module.exports.reload = ({apiVersion}) => {
    // https://github.com/expressjs/express/issues/2596
    router = siteRoutes({start: true, apiVersion});
    Object.setPrototypeOf(SiteRouter, router);

    // re-initialize apps (register app routers, because we have re-initialized the site routers)
    appService.init();

    // connect routers and resources again
    urlService.queue.start({
        event: 'init',
        tolerance: 100,
        requiredSubscriberCount: 1
    });
};
