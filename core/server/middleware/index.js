var debug           = require('debug')('ghost:middleware'),
    bodyParser      = require('body-parser'),
    compress        = require('compression'),
    config          = require('../config'),
    errors          = require('../errors'),
    express         = require('express'),
    hbs             = require('express-hbs'),
    path            = require('path'),
    routes          = require('../routes'),
    serveStatic     = require('express').static,
    slashes         = require('connect-slashes'),
    storage         = require('../storage'),
    logging         = require('../logging'),
    i18n            = require('../i18n'),
    utils           = require('../utils'),
    sitemapHandler  = require('../data/xml/sitemap/handler'),
    multer          = require('multer'),
    tmpdir          = require('os').tmpdir,
    cacheControl     = require('./cache-control'),
    checkSSL         = require('./check-ssl'),
    decideIsAdmin    = require('./decide-is-admin'),
    redirectToSetup  = require('./redirect-to-setup'),
    serveSharedFile  = require('./serve-shared-file'),
    spamPrevention   = require('./spam-prevention'),
    staticTheme      = require('./static-theme'),
    themeHandler     = require('./theme-handler'),
    uncapitalise     = require('./uncapitalise'),
    maintenance      = require('./maintenance'),
    errorHandler     = require('./error-handler'),
    versionMatch     = require('./api/version-match'),
    cors             = require('./cors'),
    validation       = require('./validation'),
    netjet           = require('netjet'),
    labs             = require('./labs'),
    helpers          = require('../helpers'),
    middleware,
    setupMiddleware;

middleware = {
    upload: multer({dest: tmpdir()}),
    validation: validation,
    cacheControl: cacheControl,
    spamPrevention: spamPrevention,
    api: {
        errorHandler: errorHandler,
        cors: cors,
        labs: labs,
        versionMatch: versionMatch,
        maintenance: maintenance
    }
};

setupMiddleware = function setupMiddleware(blogApp) {
    debug('Middleware start');
    var corePath = config.get('paths').corePath,
        adminApp = express(),
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

    // Favicon
    blogApp.use(serveSharedFile('favicon.ico', 'image/x-icon', utils.ONE_DAY_S));

    // Ghost-Url
    blogApp.use(serveSharedFile('shared/ghost-url.js', 'application/javascript', utils.ONE_HOUR_S));
    blogApp.use(serveSharedFile('shared/ghost-url.min.js', 'application/javascript', utils.ONE_HOUR_S));

    // Static assets
    blogApp.use('/shared', serveStatic(
        path.join(corePath, '/shared'),
        {maxAge: utils.ONE_HOUR_MS, fallthrough: false}
    ));
    blogApp.use('/content/images', storage.getStorage().serve());

    debug('Static content done');
    // First determine whether we're serving admin or theme content
    blogApp.use(decideIsAdmin);
    blogApp.use(themeHandler.updateActiveTheme);
    blogApp.use(themeHandler.configHbsForContext);

    // Admin only config
    blogApp.use('/ghost', serveStatic(
        config.get('paths').clientAssets,
        {maxAge: utils.ONE_YEAR_MS}
    ));

    // Force SSL
    // NOTE: Importantly this is _after_ the check above for admin-theme static resources,
    //       which do not need HTTPS. In fact, if HTTPS is forced on them, then 404 page might
    //       not display properly when HTTPS is not available!
    blogApp.use(checkSSL);
    adminApp.set('views', config.get('paths').adminViews);

    // Theme only config
    blogApp.use(staticTheme());
    debug('Themes done');

    // setup middleware for internal apps
    // @TODO: refactor this to be a proper app middleware hook for internal & external apps
    config.get('internalApps').forEach(function (appName) {
        var app = require(path.join(config.get('paths').internalAppPath, appName));
        if (app.hasOwnProperty('setupMiddleware')) {
            app.setupMiddleware(blogApp);
        }
    });
    debug('Internal apps done');

    // Serve sitemap.xsl file
    blogApp.use(serveSharedFile('sitemap.xsl', 'text/xsl', utils.ONE_DAY_S));

    // Serve robots.txt if not found in theme
    blogApp.use(serveSharedFile('robots.txt', 'text/plain', utils.ONE_HOUR_S));

    // site map
    sitemapHandler(blogApp);

    // Add in all trailing slashes
    blogApp.use(slashes(true, {
        headers: {
            'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S
        }
    }));
    blogApp.use(uncapitalise);

    // Body parsing
    blogApp.use(bodyParser.json({limit: '1mb'}));
    blogApp.use(bodyParser.urlencoded({extended: true, limit: '1mb'}));

    // ### Caching
    // Blog frontend is cacheable
    blogApp.use(cacheControl('public'));
    // Admin shouldn't be cached
    adminApp.use(cacheControl('private'));
    // API shouldn't be cached
    blogApp.use(routes.apiBaseUri, cacheControl('private'));

    // local data
    blogApp.use(themeHandler.ghostLocals);

    debug('General middleware done');

    // ### Routing
    // Set up API routes
    blogApp.use(routes.apiBaseUri, routes.api(middleware));

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
        next(new errors.NotFoundError(i18n.t('errors.errors.pageNotFound')));
    });

    blogApp.use(errorHandler);
    debug('Middleware end');
};

module.exports = setupMiddleware;
// Export middleware functions directly
module.exports.middleware = middleware;
