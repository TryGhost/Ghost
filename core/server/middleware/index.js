var debug           = require('debug')('ghost:middleware'),
    express         = require('express'),
    hbs             = require('express-hbs'),
    path            = require('path'),

    // app requires
    config          = require('../config'),
    errors          = require('../errors'),
    helpers         = require('../helpers'),
    i18n            = require('../i18n'),
    logging         = require('../logging'),
    routes          = require('../routes'),
    storage         = require('../storage'),
    utils           = require('../utils'),

    // This should probably be an internal app
    sitemapHandler  = require('../data/xml/sitemap/handler'),

    // middleware
    compress        = require('compression'),
    netjet          = require('netjet'),
    serveStatic     = require('express').static,
    // local middleware
    cacheControl    = require('./cache-control'),
    checkSSL        = require('./check-ssl'),
    decideIsAdmin   = require('./decide-is-admin'),
    errorHandler    = require('./error-handler'),
    ghostLocals     = require('./ghost-locals'),
    maintenance     = require('./maintenance'),
    prettyURLs      = require('./pretty-urls'),
    redirectToSetup = require('./redirect-to-setup'),
    serveSharedFile = require('./serve-shared-file'),
    staticTheme     = require('./static-theme'),
    themeHandler    = require('./theme-handler');

module.exports = function setupMiddleware(blogApp) {
    debug('Middleware start');

    var adminApp = express(),
        adminHbs = hbs.create();

    // ##Configuration

    // enabled gzip compression by default
    if (config.get('server').compress !== false) {
        blogApp.use(compress());
    }

    // ## View engine
    // set the view engine
    blogApp.set('view engine', 'hbs');

    // Create a hbs instance for admin and init view engine
    adminApp.set('view engine', 'hbs');
    adminApp.engine('hbs', adminHbs.express3({}));
    debug('Views done');

    // Load helpers
    helpers.loadCoreHelpers(adminHbs);
    debug('Helpers done');

    // Make sure 'req.secure' is valid for proxied requests
    // (X-Forwarded-Proto header will be checked, if present)
    blogApp.enable('trust proxy');

    /**
     * request logging
     */
    blogApp.use(function expressLogging(req, res, next) {
        res.once('finish', function () {
            logging.request({req: req, res: res, err: req.err});
        });

        next();
    });

    if (debug.enabled) {
        // debug keeps a timer, so this is super useful
        blogApp.use((function () {
            var reqDebug = require('debug')('ghost:req');
            return function debugLog(req, res, next) {
                reqDebug('Request', req.originalUrl);
                next();
            };
        })());
    }

    // Preload link headers
    if (config.get('preloadHeaders')) {
        blogApp.use(netjet({
            cache: {
                max: config.get('preloadHeaders')
            }
        }));
    }

    // This sets global res.locals which are needed everywhere
    blogApp.use(ghostLocals);

    // First determine whether we're serving admin or theme content
    // @TODO refactor this horror away!
    blogApp.use(decideIsAdmin);

    // Theme middleware
    // rightly or wrongly currently comes before theme static assets
    // @TODO revisit where and when these are needed
    blogApp.use(themeHandler.updateActiveTheme);
    blogApp.use(themeHandler.configHbsForContext);
    debug('Themes done');

    // Static content/assets
    // Favicon
    blogApp.use(serveSharedFile('favicon.ico', 'image/x-icon', utils.ONE_DAY_S));
    // Ghost-Url
    blogApp.use(serveSharedFile('shared/ghost-url.js', 'application/javascript', utils.ONE_HOUR_S));
    blogApp.use(serveSharedFile('shared/ghost-url.min.js', 'application/javascript', utils.ONE_HOUR_S));
    // Serve sitemap.xsl file
    blogApp.use(serveSharedFile('sitemap.xsl', 'text/xsl', utils.ONE_DAY_S));
    // Serve robots.txt if not found in theme
    blogApp.use(serveSharedFile('robots.txt', 'text/plain', utils.ONE_HOUR_S));
    // Serve blog images using the storage adapter
    blogApp.use('/content/images', storage.getStorage().serve());

    // Admin assets
    // Admin only config
    blogApp.use('/ghost/assets', serveStatic(
        config.get('paths').clientAssets,
        {maxAge: utils.ONE_YEAR_MS}
    ));

    // Theme static assets/files
    blogApp.use(staticTheme());
    debug('Static content done');

    // Force SSL
    // must happen AFTER asset loading and BEFORE routing
    blogApp.use(checkSSL);
    adminApp.set('views', config.get('paths').adminViews);

    // setup middleware for internal apps
    // @TODO: refactor this to be a proper app middleware hook for internal & external apps
    config.get('internalApps').forEach(function (appName) {
        var app = require(path.join(config.get('paths').internalAppPath, appName));
        if (app.hasOwnProperty('setupMiddleware')) {
            app.setupMiddleware(blogApp);
        }
    });

    // site map - this should probably be refactored to be an internal app
    sitemapHandler(blogApp);
    debug('Internal apps done');

    // Add in all trailing slashes & remove uppercase
    // must happen AFTER asset loading and BEFORE routing
    blogApp.use(prettyURLs);

    // ### Caching
    // Blog frontend is cacheable
    blogApp.use(cacheControl('public'));
    // Admin shouldn't be cached
    adminApp.use(cacheControl('private'));

    debug('General middleware done');

    // ### Routing
    // Set up API routes
    blogApp.use(routes.apiBaseUri, routes.api());

    // Mount admin express app to /ghost and set up routes
    adminApp.use(redirectToSetup);
    adminApp.use(maintenance);
    adminApp.use(routes.admin());
    blogApp.use('/ghost', adminApp);
    debug('Admin app & api done');

    // send 503 error page in case of maintenance
    blogApp.use(maintenance);

    // Set up Frontend routes (including private blogging routes)
    blogApp.use(routes.frontend());

    // ### Error handlers
    blogApp.use(function pageNotFound(req, res, next) {
        next(new errors.NotFoundError({message: i18n.t('errors.errors.pageNotFound')}));
    });

    blogApp.use(errorHandler);
    debug('Middleware end');
};
