// # Custom Middleware
// The following custom middleware functions cannot yet be unit tested, and as such are kept separate from
// the testable custom middleware functions in middleware.js

var api            = require('../api'),
    bodyParser     = require('body-parser'),
    config         = require('../config'),
    crypto         = require('crypto'),
    errors         = require('../errors'),
    express        = require('express'),
    fs             = require('fs'),
    hbs            = require('express-hbs'),
    logger         = require('morgan'),
    middleware     = require('./middleware'),
    packageInfo    = require('../../../package.json'),
    path           = require('path'),
    routes         = require('../routes'),
    slashes        = require('connect-slashes'),
    storage        = require('../storage'),
    url            = require('url'),
    _              = require('lodash'),
    passport       = require('passport'),
    oauth          = require('./oauth'),
    oauth2orize    = require('oauth2orize'),
    authStrategies = require('./authStrategies'),
    utils          = require('../utils'),

    expressServer,
    setupMiddleware;

// ##Custom Middleware

// ### GhostLocals Middleware
// Expose the standard locals that every external page should have available,
// separating between the theme and the admin
function ghostLocals(req, res, next) {
    // Make sure we have a locals value.
    res.locals = res.locals || {};
    res.locals.version = packageInfo.version;
    // relative path from the URL
    res.locals.relativeUrl = req.path;

    next();
}

// ### Activate Theme
// Helper for manageAdminAndTheme
function activateTheme(activeTheme) {
    var hbsOptions,
        themePartials = path.join(config.paths.themePath, activeTheme, 'partials');

    // clear the view cache
    expressServer.cache = {};

    // set view engine
    hbsOptions = {partialsDir: [config.paths.helperTemplates]};

    fs.stat(themePartials, function (err, stats) {
        // Check that the theme has a partials directory before trying to use it
        if (!err && stats && stats.isDirectory()) {
            hbsOptions.partialsDir.push(themePartials);
        }
    });

    expressServer.engine('hbs', hbs.express3(hbsOptions));

    // Update user error template
    errors.updateActiveTheme(activeTheme);

    // Set active theme variable on the express server
    expressServer.set('activeTheme', activeTheme);
}
// ### decideIsAdmin Middleware
// Uses the URL to detect whether this response should be an admin response
// This is used to ensure the right content is served, and is not for security purposes
function decideIsAdmin(req, res, next) {
    res.isAdmin = req.url.lastIndexOf('/ghost/', 0) === 0;
    next();
}

// ### configHbsForContext Middleware
// Setup handlebars for the current context (admin or theme)
function configHbsForContext(req, res, next) {
    var themeData = config.theme;
    if (req.secure && config.urlSSL) {
        // For secure requests override .url property with the SSL version
        themeData = _.clone(themeData);
        themeData.url = config.urlSSL.replace(/\/$/, '');
    }

    hbs.updateTemplateOptions({data: {blog: themeData}});
    expressServer.set('views', path.join(config.paths.themePath, expressServer.get('activeTheme')));

    // Pass 'secure' flag to the view engine
    // so that templates can choose 'url' vs 'urlSSL'
    res.locals.secure = req.secure;

    next();
}

// ### updateActiveTheme
// Updates the expressServer's activeTheme variable and subsequently
// activates that theme's views with the hbs templating engine if it
// is not yet activated.
function updateActiveTheme(req, res, next) {
    api.settings.read({context: {internal: true}, key: 'activeTheme'}).then(function (response) {
        var activeTheme = response.settings[0];
        // Check if the theme changed
        if (activeTheme.value !== expressServer.get('activeTheme')) {
            // Change theme
            if (!config.paths.availableThemes.hasOwnProperty(activeTheme.value)) {
                if (!res.isAdmin) {
                    // Throw an error if the theme is not available, but not on the admin UI
                    return errors.throwError('The currently active theme ' + activeTheme.value + ' is missing.');
                }
            } else {
                activateTheme(activeTheme.value);
            }
        }
        next();
    }).catch(function (err) {
        // Trying to start up without the active theme present, setup a simple hbs instance
        // and render an error page straight away.
        expressServer.engine('hbs', hbs.express3());
        next(err);
    });
}

// Redirect to setup if no user exists
function redirectToSetup(req, res, next) {
    /*jslint unparam:true*/

    api.authentication.isSetup().then(function (exists) {
        if (!exists.setup[0].status && !req.path.match(/\/setup\//)) {
            return res.redirect(config.paths.subdir + '/ghost/setup/');
        }
        next();
    }).catch(function (err) {
        return next(new Error(err));
    });
}

// Detect uppercase in req.path
function uncapitalise(req, res, next) {
    var pathToTest = req.path,
        isSignupOrReset = req.path.match(/(\/ghost\/(signup|reset)\/)/i),
        isAPI = req.path.match(/(\/ghost\/api\/v[\d\.]+\/.*?\/)/i);

    if (isSignupOrReset) {
        pathToTest = isSignupOrReset[1];
    }

    // Do not lowercase anything after /api/v0.1/ to protect :key/:slug
    if (isAPI) {
        pathToTest = isAPI[1];
    }

    if (/[A-Z]/.test(pathToTest)) {
        res.set('Cache-Control', 'public, max-age=' + utils.ONE_YEAR_S);
        res.redirect(301, req.url.replace(pathToTest, pathToTest.toLowerCase()));
    } else {
        next();
    }
}

function isSSLrequired(isAdmin) {
    var forceSSL = url.parse(config.url).protocol === 'https:' ? true : false,
        forceAdminSSL = (isAdmin && config.forceAdminSSL);
    if (forceSSL || forceAdminSSL) {
        return true;
    }
    return false;
}

// Check to see if we should use SSL
// and redirect if needed
function checkSSL(req, res, next) {
    if (isSSLrequired(res.isAdmin)) {
        if (!req.secure) {
            var forceAdminSSL = config.forceAdminSSL,
                redirectUrl;

            // Check if forceAdminSSL: { redirect: false } is set, which means
            // we should just deny non-SSL access rather than redirect
            if (forceAdminSSL && forceAdminSSL.redirect !== undefined && !forceAdminSSL.redirect) {
                return res.sendStatus(403);
            }

            redirectUrl = url.parse(config.urlSSL || config.url);
            return res.redirect(301, url.format({
                protocol: 'https:',
                hostname: redirectUrl.hostname,
                port: redirectUrl.port,
                pathname: req.path,
                query: req.query
            }));
        }
    }
    next();
}

// ### ServeSharedFile Middleware
// Handles requests to robots.txt and favicon.ico (and caches them)
function serveSharedFile(file, type, maxAge) {
    var content,
        filePath = path.join(config.paths.corePath, 'shared', file);

    return function serveSharedFile(req, res, next) {
        if (req.url === path.join('/', file)) {
            if (content) {
                res.writeHead(200, content.headers);
                res.end(content.body);
            } else {
                fs.readFile(filePath, function (err, buf) {
                    if (err) {
                        return next(err);
                    }

                    content = {
                        headers: {
                            'Content-Type': type,
                            'Content-Length': buf.length,
                            ETag: '"' + crypto.createHash('md5').update(buf, 'utf8').digest('hex') + '"',
                            'Cache-Control': 'public, max-age=' + maxAge
                        },
                        body: buf
                    };
                    res.writeHead(200, content.headers);
                    res.end(content.body);
                });
            }
        } else {
            next();
        }
    };
}

setupMiddleware = function (server, adminExpress) {
    var logging = config.logging,
        corePath = config.paths.corePath,
        oauthServer = oauth2orize.createServer();

    // silence JSHint without disabling unused check for the whole file
    authStrategies = authStrategies;

    // Cache express server instance
    expressServer = server;
    middleware.cacheServer(expressServer);
    middleware.cacheOauthServer(oauthServer);
    oauth.init(oauthServer, middleware.resetSpamCounter);

    // Make sure 'req.secure' is valid for proxied requests
    // (X-Forwarded-Proto header will be checked, if present)
    expressServer.enable('trust proxy');

    // Logging configuration
    if (logging !== false) {
        if (expressServer.get('env') !== 'development') {
            expressServer.use(logger(logging || {}));
        } else {
            expressServer.use(logger(logging || 'dev'));
        }
    }

    // Favicon
    expressServer.use(serveSharedFile('favicon.ico', 'image/x-icon', utils.ONE_DAY_S));

    // Static assets
    expressServer.use('/shared', express['static'](path.join(corePath, '/shared'), {maxAge: utils.ONE_HOUR_MS}));
    expressServer.use('/content/images', storage.getStorage().serve());
    expressServer.use('/ghost/scripts', express['static'](path.join(corePath, '/built/scripts'), {maxAge: utils.ONE_YEAR_MS}));
    expressServer.use('/public', express['static'](path.join(corePath, '/built/public'), {maxAge: utils.ONE_YEAR_MS}));

    // First determine whether we're serving admin or theme content
    expressServer.use(decideIsAdmin);
    expressServer.use(updateActiveTheme);
    expressServer.use(configHbsForContext);

    // Admin only config
    expressServer.use('/ghost', express['static'](path.join(corePath, '/client/assets'), {maxAge: utils.ONE_YEAR_MS}));

    // Force SSL
    // NOTE: Importantly this is _after_ the check above for admin-theme static resources,
    //       which do not need HTTPS. In fact, if HTTPS is forced on them, then 404 page might
    //       not display properly when HTTPS is not available!
    expressServer.use(checkSSL);
    adminExpress.set('views', config.paths.adminViews);

    // Theme only config
    expressServer.use(middleware.staticTheme());

    // Serve robots.txt if not found in theme
    expressServer.use(serveSharedFile('robots.txt', 'text/plain', utils.ONE_YEAR_S));

    // Add in all trailing slashes, properly include the subdir path
    // in the redirect.
    expressServer.use(slashes(true, {
        headers: {
            'Cache-Control': 'public, max-age=' + utils.ONE_YEAR_S
        },
        base: config.paths.subdir
    }));
    expressServer.use(uncapitalise);

    // Body parsing
    expressServer.use(bodyParser.json());
    expressServer.use(bodyParser.urlencoded({extended: true}));

    expressServer.use(passport.initialize());

    // ### Caching
    expressServer.use(middleware.cacheControl('public'));
    adminExpress.use(middleware.cacheControl('private'));

    // enable authentication
    expressServer.use(middleware.authenticate);

    // local data
    expressServer.use(ghostLocals);

    // ### Routing
    // Set up API routes
    expressServer.use(routes.apiBaseUri, routes.api(middleware));

    // Mount admin express app to /ghost and set up routes
    adminExpress.use(middleware.redirectToSetup);
    adminExpress.use(routes.admin());
    expressServer.use('/ghost', adminExpress);

    // Set up Frontend routes
    expressServer.use(routes.frontend());

    // ### Error handling
    // 404 Handler
    expressServer.use(errors.error404);

    // 500 Handler
    expressServer.use(errors.error500);
};

module.exports = setupMiddleware;
// Export middleware functions directly
module.exports.middleware = middleware;
// Expose middleware functions in this file as well
module.exports.middleware.redirectToSetup = redirectToSetup;
