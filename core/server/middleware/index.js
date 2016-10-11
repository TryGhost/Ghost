var debug           = require('debug')('ghost:middleware'),
    path            = require('path'),

    // app requires
    config          = require('../config'),
    helpers         = require('../helpers'),
    logging         = require('../logging'),
    routes          = require('../routes'),
    storage         = require('../storage'),
    utils           = require('../utils'),

    // This should probably be an internal app
    sitemapHandler  = require('../data/xml/sitemap/handler'),

    // middleware
    compress        = require('compression'),
    netjet          = require('netjet'),

    // local middleware
    cacheControl    = require('./cache-control'),
    checkSSL        = require('./check-ssl'),
    errorHandler    = require('./error-handler'),
    ghostLocals     = require('./ghost-locals'),
    maintenance     = require('./maintenance'),
    prettyURLs      = require('./pretty-urls'),
    serveSharedFile = require('./serve-shared-file'),
    staticTheme     = require('./static-theme'),
    themeHandler    = require('./theme-handler');

module.exports = function setupMiddleware(parentApp) {
    debug('Middleware start');

    // ## Global settings

    // Make sure 'req.secure' is valid for proxied requests
    // (X-Forwarded-Proto header will be checked, if present)
    parentApp.enable('trust proxy');

    /**
     * request logging
     */
    parentApp.use(function expressLogging(req, res, next) {
        res.once('finish', function () {
            logging.request({req: req, res: res, err: req.err});
        });

        next();
    });

    if (debug.enabled) {
        // debug keeps a timer, so this is super useful
        parentApp.use((function () {
            var reqDebug = require('debug')('ghost:req');
            return function debugLog(req, res, next) {
                reqDebug('Request', req.originalUrl);
                next();
            };
        })());
    }

    // enabled gzip compression by default
    if (config.get('server').compress !== false) {
        parentApp.use(compress());
    }

    // Preload link headers
    if (config.get('preloadHeaders')) {
        parentApp.use(netjet({
            cache: {
                max: config.get('preloadHeaders')
            }
        }));
    }

    // This sets global res.locals which are needed everywhere
    parentApp.use(ghostLocals);

    // ## App - specific code
    // set the view engine
    parentApp.set('view engine', 'hbs');

    // Load helpers
    helpers.loadCoreHelpers();
    debug('Helpers done');

    // Theme middleware
    // rightly or wrongly currently comes before theme static assets
    // @TODO revisit where and when these are needed
    parentApp.use(themeHandler.updateActiveTheme);
    parentApp.use(themeHandler.configHbsForContext);
    debug('Themes done');

    // Static content/assets
    // @TODO make sure all of these have a local 404 error handler
    // Favicon
    parentApp.use(serveSharedFile('favicon.ico', 'image/x-icon', utils.ONE_DAY_S));
    // Ghost-Url
    parentApp.use(serveSharedFile('shared/ghost-url.js', 'application/javascript', utils.ONE_HOUR_S));
    parentApp.use(serveSharedFile('shared/ghost-url.min.js', 'application/javascript', utils.ONE_HOUR_S));
    // Serve sitemap.xsl file
    parentApp.use(serveSharedFile('sitemap.xsl', 'text/xsl', utils.ONE_DAY_S));
    // Serve robots.txt if not found in theme
    parentApp.use(serveSharedFile('robots.txt', 'text/plain', utils.ONE_HOUR_S));
    // Serve blog images using the storage adapter
    parentApp.use('/content/images', storage.getStorage().serve());

    // Theme static assets/files
    parentApp.use(staticTheme());
    debug('Static content done');

    // setup middleware for internal apps
    // @TODO: refactor this to be a proper app middleware hook for internal & external apps
    config.get('internalApps').forEach(function (appName) {
        var app = require(path.join(config.get('paths').internalAppPath, appName));
        if (app.hasOwnProperty('setupMiddleware')) {
            app.setupMiddleware(parentApp);
        }
    });

    // site map - this should probably be refactored to be an internal app
    sitemapHandler(parentApp);
    debug('Internal apps done');

    // Load the API
    // @TODO: finish refactoring the API app
    // @TODO: decide what to do with these paths - config defaults? config overrides?
    parentApp.use('/ghost/api/v0.1/', require('../api/app')());

    // ADMIN
    parentApp.use('/ghost', require('../admin')());

    debug('Admin app & api done');

    // send 503 error page in case of maintenance
    parentApp.use(maintenance);

    // Force SSL if required
    // must happen AFTER asset loading and BEFORE routing
    parentApp.use(checkSSL);

    // Add in all trailing slashes & remove uppercase
    // must happen AFTER asset loading and BEFORE routing
    parentApp.use(prettyURLs);

    // ### Caching
    // Blog frontend is cacheable
    parentApp.use(cacheControl('public'));

    debug('General middleware done');

    // Set up Frontend routes (including private blogging routes)
    parentApp.use(routes.frontend());

    // ### Error handlers
    parentApp.use(errorHandler.pageNotFound);
    parentApp.use(errorHandler.handleHTMLResponse);
    debug('Middleware end');
};
