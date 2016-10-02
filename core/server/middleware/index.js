var debug           = require('debug')('ghost:middleware'),
    bodyParser      = require('body-parser'),
    compress        = require('compression'),
    config          = require('../config'),
    errors          = require('../errors'),
    path            = require('path'),
    netjet           = require('netjet'),
    multer          = require('multer'),
    tmpdir          = require('os').tmpdir,
    serveStatic     = require('express').static,
    slashes         = require('connect-slashes'),
    routes          = require('../routes'),
    storage         = require('../storage'),
    logging         = require('../logging'),
    i18n            = require('../i18n'),
    utils           = require('../utils'),
    sitemapHandler  = require('../data/xml/sitemap/handler'),
    cacheControl     = require('./cache-control'),
    checkSSL         = require('./check-ssl'),
    decideIsAdmin   = require('./decide-is-admin'),
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
    var corePath = config.get('paths').corePath;

    // ##Configuration
    // enabled gzip compression by default
    if (config.get('server').compress !== false) {
        blogApp.use(compress());
    }

    // ## View engine
    // set the view engine
    blogApp.set('view engine', 'hbs');

    // Load helpers
    helpers.loadCoreHelpers();
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

    // @TODO remove this
    blogApp.use(decideIsAdmin);

    // @TODO: fix this!
    require('../admin').assets(blogApp);

    debug('Static content done');


    // Force SSL
    // @TODO fix this so that it works for the API, currently it is incorrectly broken
    // @TODO make sure this only happens for the admin app once
    blogApp.use(checkSSL);
    debug('SSL done');

    // Theme middleware
    blogApp.use(themeHandler.updateActiveTheme);
    blogApp.use(themeHandler.configHbsForContext);
    blogApp.use(themeHandler.ghostLocals);

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

    // Body parsing
    blogApp.use(bodyParser.json({limit: '1mb'}));
    blogApp.use(bodyParser.urlencoded({extended: true, limit: '1mb'}));

    // send 503 error page in case of maintenance
    blogApp.use(maintenance);

    // Pretty URL redirects, these should be for the frontend, ONLY?
    // If we want to use these for the API, and not the admin, then we need
    // To mount them on the API separately
    blogApp.use(slashes(true, {
        headers: {
            'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S
        }
    }));
    blogApp.use(uncapitalise);

    debug('General middleware done');

    // API shouldn't be cached
    blogApp.use(routes.apiBaseUri, cacheControl('private'));
    // Load the API
    blogApp.use(routes.apiBaseUri, routes.api(middleware));

    // ADMIN
    blogApp.use('/ghost', require('../admin')());

    debug('Admin app & api done');

    // Blog frontend is cacheable
    blogApp.use(cacheControl('public'));
    // Set up Frontend routes (including private blogging routes)
    blogApp.use(routes.frontend());

    // ### Error handlers
    blogApp.use(function pageNotFound(req, res, next) {
        next(new errors.NotFoundError({message: i18n.t('errors.errors.pageNotFound')}));
    });

    blogApp.use(errorHandler);
    debug('Middleware end');
};

module.exports = setupMiddleware;
// Export middleware functions directly
module.exports.middleware = middleware;
