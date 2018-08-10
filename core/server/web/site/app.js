var debug = require('ghost-ignition').debug('blog'),
    path = require('path'),
    express = require('express'),
    setPrototypeOf = require('setprototypeof'),

    // App requires
    config = require('../../config'),
    apps = require('../../services/apps'),
    constants = require('../../lib/constants'),
    storage = require('../../adapters/storage'),
    urlService = require('../../services/url'),

    // This should probably be an internal app
    sitemapHandler = require('../../data/xml/sitemap/handler'),

    // Route Service
    siteRoutes = require('./routes'),

    // Global/shared middleware
    cacheControl = require('../middleware/cache-control'),
    errorHandler = require('../middleware/error-handler'),
    frontendClient = require('../middleware/frontend-client'),
    maintenance = require('../middleware/maintenance'),
    prettyURLs = require('../middleware/pretty-urls'),
    urlRedirects = require('../middleware/url-redirects'),

    // local middleware
    servePublicFile = require('../middleware/serve-public-file'),
    staticTheme = require('../middleware/static-theme'),
    customRedirects = require('../middleware/custom-redirects'),
    serveFavicon = require('../middleware/serve-favicon'),
    adminRedirects = require('../middleware/admin-redirects'),

    // middleware for themes
    themeMiddleware = require('../../services/themes').middleware;

let router;

function SiteRouter(req, res, next) {
    router(req, res, next);
}

module.exports = function setupSiteApp(options = {}) {
    debug('Site setup start');

    var siteApp = express();

    // ## App - specific code
    // set the view engine
    siteApp.set('view engine', 'hbs');

    // you can extend Ghost with a custom redirects file
    // see https://github.com/TryGhost/Ghost/issues/7707
    customRedirects.use(siteApp);

    // More redirects
    siteApp.use(adminRedirects());

    // force SSL if blog url is set to https. The redirects handling must happen before asset and page routing,
    // otherwise we serve assets/pages with http. This can cause mixed content warnings in the admin client.
    siteApp.use(urlRedirects);

    // Static content/assets
    // @TODO make sure all of these have a local 404 error handler
    // Favicon
    siteApp.use(serveFavicon());
    // /public/ghost-sdk.js
    siteApp.use(servePublicFile('public/ghost-sdk.js', 'application/javascript', constants.ONE_HOUR_S));
    siteApp.use(servePublicFile('public/ghost-sdk.min.js', 'application/javascript', constants.ONE_YEAR_S));
    // Serve sitemap.xsl file
    siteApp.use(servePublicFile('sitemap.xsl', 'text/xsl', constants.ONE_DAY_S));

    // Serve stylesheets for default templates
    siteApp.use(servePublicFile('public/ghost.css', 'text/css', constants.ONE_HOUR_S));
    siteApp.use(servePublicFile('public/ghost.min.css', 'text/css', constants.ONE_YEAR_S));

    // Serve images for default templates
    siteApp.use(servePublicFile('public/404-ghost@2x.png', 'png', constants.ONE_HOUR_S));
    siteApp.use(servePublicFile('public/404-ghost.png', 'png', constants.ONE_HOUR_S));

    // Serve blog images using the storage adapter
    siteApp.use('/' + urlService.utils.STATIC_IMAGE_URL_PREFIX, storage.getStorage().serve());

    // @TODO find this a better home
    // We do this here, at the top level, because helpers require so much stuff.
    // Moving this to being inside themes, where it probably should be requires the proxy to be refactored
    // Else we end up with circular dependencies
    require('../../helpers').loadCoreHelpers();
    debug('Helpers done');

    // Theme middleware
    // This should happen AFTER any shared assets are served, as it only changes things to do with templates
    // At this point the active theme object is already updated, so we have the right path, so it can probably
    // go after staticTheme() as well, however I would really like to simplify this and be certain
    siteApp.use(themeMiddleware);
    debug('Themes done');

    // Theme static assets/files
    siteApp.use(staticTheme());
    debug('Static content done');

    // Serve robots.txt if not found in theme
    siteApp.use(servePublicFile('robots.txt', 'text/plain', constants.ONE_HOUR_S));

    // setup middleware for internal apps
    // @TODO: refactor this to be a proper app middleware hook for internal & external apps
    config.get('apps:internal').forEach(function (appName) {
        var app = require(path.join(config.get('paths').internalAppPath, appName));
        if (app.hasOwnProperty('setupMiddleware')) {
            app.setupMiddleware(siteApp);
        }
    });

    // site map - this should probably be refactored to be an internal app
    sitemapHandler(siteApp);
    debug('Internal apps done');

    // send 503 error page in case of maintenance
    siteApp.use(maintenance);

    // Add in all trailing slashes & remove uppercase
    // must happen AFTER asset loading and BEFORE routing
    siteApp.use(prettyURLs);

    // ### Caching
    // Site frontend is cacheable
    siteApp.use(cacheControl('public'));

    // Fetch the frontend client into res.locals
    siteApp.use(frontendClient);

    debug('General middleware done');

    router = siteRoutes(options);
    setPrototypeOf(SiteRouter, router);

    // Set up Frontend routes (including private blogging routes)
    siteApp.use(SiteRouter);

    // ### Error handlers
    siteApp.use(errorHandler.pageNotFound);
    siteApp.use(errorHandler.handleThemeResponse);

    debug('Site setup end');

    return siteApp;
};

module.exports.reload = () => {
    // https://github.com/expressjs/express/issues/2596
    router = siteRoutes({start: true});
    setPrototypeOf(SiteRouter, router);

    // re-initialse apps (register app routers, because we have re-initialised the site routers)
    apps.init();

    // connect routers and resources again
    urlService.queue.start({
        event: 'init',
        tolerance: 100,
        requiredSubscriberCount: 1
    });
};
