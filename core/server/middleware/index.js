var bodyParser      = require('body-parser'),
    config          = require('../config'),
    errors          = require('../errors'),
    express         = require('express'),
    logger          = require('morgan'),
    path            = require('path'),
    routes          = require('../routes'),
    slashes         = require('connect-slashes'),
    storage         = require('../storage'),
    passport        = require('passport'),
    oauth2orize     = require('oauth2orize'),
    utils           = require('../utils'),
    sitemapHandler  = require('../data/xml/sitemap/handler'),

    apiErrorHandlers = require('./api-error-handlers'),
    authenticate     = require('./authenticate'),
    authStrategies   = require('./auth-strategies'),
    busboy           = require('./ghost-busboy'),
    clientAuth       = require('./client-auth'),
    cacheControl     = require('./cache-control'),
    checkSSL         = require('./check-ssl'),
    decideIsAdmin    = require('./decide-is-admin'),
    privateBlogging  = require('./private-blogging'),
    redirectToSetup  = require('./redirect-to-setup'),
    serveSharedFile  = require('./serve-shared-file'),
    spamPrevention   = require('./spam-prevention'),
    staticTheme      = require('./static-theme'),
    uncapitalise     = require('./uncapitalise'),
    oauth            = require('./oauth'),

    themeHandler     = require('./theme-handler'),
    privateBlogging  = require('./private-blogging'),

    ClientPasswordStrategy  = require('passport-oauth2-client-password').Strategy,
    BearerStrategy          = require('passport-http-bearer').Strategy,

    blogApp,
    middleware,
    setupMiddleware;

middleware = {
    busboy: busboy,
    cacheControl: cacheControl,
    spamPrevention: spamPrevention,
    privateBlogging: privateBlogging,
    api: {
        cacheOauthServer: clientAuth.cacheOauthServer,
        authenticateClient: clientAuth.authenticateClient,
        generateAccessToken: clientAuth.generateAccessToken,
        errorHandler: apiErrorHandlers.errorHandler
    }
};

setupMiddleware = function setupMiddleware(blogAppInstance, adminApp) {
    var logging = config.logging,
        corePath = config.paths.corePath,
        oauthServer = oauth2orize.createServer();

    // silence JSHint without disabling unused check for the whole file
    passport.use(new ClientPasswordStrategy(authStrategies.clientPasswordStrategy));
    passport.use(new BearerStrategy(authStrategies.bearerStrategy));

    // Cache express server instance
    blogApp = blogAppInstance;
    middleware.api.cacheOauthServer(oauthServer);
    oauth.init(oauthServer, spamPrevention.resetCounter);

    // Make sure 'req.secure' is valid for proxied requests
    // (X-Forwarded-Proto header will be checked, if present)
    blogApp.enable('trust proxy');

    // Logging configuration
    if (logging !== false) {
        if (blogApp.get('env') !== 'development') {
            blogApp.use(logger('combined', logging));
        } else {
            blogApp.use(logger('dev', logging));
        }
    }

    // Favicon
    blogApp.use(serveSharedFile('favicon.ico', 'image/x-icon', utils.ONE_DAY_S));

    // Static assets
    blogApp.use('/shared', express['static'](path.join(corePath, '/shared'), {maxAge: utils.ONE_HOUR_MS}));
    blogApp.use('/content/images', storage.getStorage().serve());
    blogApp.use('/public', express['static'](path.join(corePath, '/built/public'), {maxAge: utils.ONE_YEAR_MS}));

    // First determine whether we're serving admin or theme content
    blogApp.use(decideIsAdmin);
    blogApp.use(themeHandler(blogApp).updateActiveTheme);
    blogApp.use(themeHandler(blogApp).configHbsForContext);

    // Admin only config
    blogApp.use('/ghost', express['static'](config.paths.clientAssets, {maxAge: utils.ONE_YEAR_MS}));

    // Force SSL
    // NOTE: Importantly this is _after_ the check above for admin-theme static resources,
    //       which do not need HTTPS. In fact, if HTTPS is forced on them, then 404 page might
    //       not display properly when HTTPS is not available!
    blogApp.use(checkSSL);
    adminApp.set('views', config.paths.adminViews);

    // Theme only config
    blogApp.use(staticTheme());

    // Check if password protected blog
    blogApp.use(privateBlogging.checkIsPrivate); // check if the blog is protected
    blogApp.use(privateBlogging.filterPrivateRoutes);

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
    blogApp.use(bodyParser.json());
    blogApp.use(bodyParser.urlencoded({extended: true}));

    blogApp.use(passport.initialize());

    // ### Caching
    // Blog frontend is cacheable
    blogApp.use(cacheControl('public'));
    // Admin shouldn't be cached
    adminApp.use(cacheControl('private'));
    // API shouldn't be cached
    blogApp.use(routes.apiBaseUri, cacheControl('private'));

    // enable authentication
    blogApp.use(authenticate);

    // local data
    blogApp.use(themeHandler(blogApp).ghostLocals);

    // ### Routing
    // Set up API routes
    blogApp.use(routes.apiBaseUri, routes.api(middleware));

    // Mount admin express app to /ghost and set up routes
    adminApp.use(redirectToSetup);
    adminApp.use(routes.admin());
    blogApp.use('/ghost', adminApp);

    // Set up Frontend routes
    blogApp.use(routes.frontend(middleware));

    // ### Error handling
    // 404 Handler
    blogApp.use(errors.error404);

    // 500 Handler
    blogApp.use(errors.error500);
};

module.exports = setupMiddleware;
// Export middleware functions directly
module.exports.middleware = middleware;
