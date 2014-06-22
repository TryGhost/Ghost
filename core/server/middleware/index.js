// # Custom Middleware
// The following custom middleware functions cannot yet be unit tested, and as such are kept separate from
// the testable custom middleware functions in middleware.js

var api         = require('../api'),
    BSStore     = require('../bookshelf-session'),
    bodyParser  = require('body-parser'),
    config      = require('../config'),
    cookieParser = require('cookie-parser'),
    errors      = require('../errors'),
    express     = require('express'),
    favicon     = require('static-favicon'),
    fs          = require('fs'),
    hbs         = require('express-hbs'),
    logger      = require('morgan'),
    middleware  = require('./middleware'),
    packageInfo = require('../../../package.json'),
    path        = require('path'),
    routes      = require('../routes'),
    session     = require('express-session'),
    slashes     = require('connect-slashes'),
    storage     = require('../storage'),
    url         = require('url'),
    when        = require('when'),
    _           = require('lodash'),

    expressServer,
    ONE_HOUR_S  = 60 * 60,
    ONE_YEAR_S  = 365 * 24 * ONE_HOUR_S,
    ONE_HOUR_MS = ONE_HOUR_S * 1000,
    ONE_YEAR_MS = 365 * 24 * ONE_HOUR_MS;

// ##Custom Middleware

// ### GhostLocals Middleware
// Expose the standard locals that every external page should have available,
// separating between the theme and the admin
function ghostLocals(req, res, next) {
    // Make sure we have a locals value.
    res.locals = res.locals || {};
    res.locals.version = packageInfo.version;
    // relative path from the URL, not including subdir
    res.locals.relativeUrl = req.path.replace(config().paths.subdir, '');

    if (res.isAdmin) {
        res.locals.csrfToken = req.csrfToken();
        when.all([
            api.users.read({id: req.session.user}, {context: {user: req.session.user}}),
            api.notifications.browse()
        ]).then(function (values) {
            var currentUser = values[0].users[0],
                notifications = values[1].notifications;

            _.extend(res.locals,  {
                currentUser: {
                    name: currentUser.name,
                    email: currentUser.email,
                    image: currentUser.image
                },
                messages: notifications
            });
            next();
        }).otherwise(function () {
            // Only show passive notifications
            // ToDo: Remove once ember handles passive notifications.
            api.notifications.browse().then(function (notifications) {
                _.extend(res.locals, {
                    messages: _.reject(notifications.notifications, function (notification) {
                        return notification.status !== 'passive';
                    })
                });
                next();
            });
        });
    } else {
        next();
    }
}

function initThemeData(secure) {
    var themeConfig = config.theme();
    if (secure && config().urlSSL) {
        // For secure requests override .url property with the SSL version
        themeConfig = _.clone(themeConfig);
        themeConfig.url = config().urlSSL.replace(/\/$/, '');
    }
    return themeConfig;
}

// ### Activate Theme
// Helper for manageAdminAndTheme
function activateTheme(activeTheme) {
    var hbsOptions,
        themePartials = path.join(config().paths.themePath, activeTheme, 'partials');

    // clear the view cache
    expressServer.cache = {};

    // set view engine
    hbsOptions = { partialsDir: [ config().paths.helperTemplates ] };

    fs.stat(themePartials, function (err, stats) {
        // Check that the theme has a partials directory before trying to use it
        if (!err && stats && stats.isDirectory()) {
            hbsOptions.partialsDir.push(themePartials);
        }
    });

    expressServer.set('theme view engine', hbs.express3(hbsOptions));

    // Update user error template
    errors.updateActiveTheme(activeTheme);

    // Set active theme variable on the express server
    expressServer.set('activeTheme', activeTheme);
}

// ### decideContext Middleware
// Uses the URL to detect whether this response should be an admin response
// This is used to ensure the right content is served, and is not for security purposes
function decideContext(req, res, next) {
    res.isAdmin = req.url.lastIndexOf(config().paths.subdir + '/ghost/', 0) === 0;

    if (res.isAdmin) {
        expressServer.enable('admin');
        expressServer.engine('hbs', expressServer.get('admin view engine'));
        expressServer.set('views', config().paths.adminViews);
    } else {
        expressServer.disable('admin');
        var themeData = initThemeData(req.secure);
        hbs.updateTemplateOptions({ data: {blog: themeData} });
        expressServer.engine('hbs', expressServer.get('theme view engine'));
        expressServer.set('views', path.join(config().paths.themePath, expressServer.get('activeTheme')));
    }

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
            if (!config().paths.availableThemes.hasOwnProperty(activeTheme.value)) {
                if (!res.isAdmin) {
                    // Throw an error if the theme is not available, but not on the admin UI
                    return errors.throwError('The currently active theme ' + activeTheme.value + ' is missing.');
                }
            } else {
                activateTheme(activeTheme.value);
            }
        }
        next();
    }).otherwise(function (err) {
        // Trying to start up without the active theme present, setup a simple hbs instance
        // and render an error page straight away.
        expressServer.engine('hbs', hbs.express3());
        next(err);
    });
}

// Redirect to signup if no users are currently created
function redirectToSignup(req, res, next) {
    /*jslint unparam:true*/

    api.users.doesUserExist().then(function (exists) {
        if (!exists) {
            // TODO remove this when ember admin becomes the default
            if (req.path.match(/\/ember\//)) {
                if (!req.path.match(/\/ghost\/ember\/signup\//)) {
                    return res.redirect(config().paths.subdir + '/ghost/ember/signup/');
                } else {
                    return next();
                }
            }
            // END remove this
            return res.redirect(config().paths.subdir + '/ghost/signup/');
        }
        next();
    }).otherwise(function (err) {
        return next(new Error(err));
    });
}

function isSSLrequired(isAdmin) {
    var forceSSL = url.parse(config().url).protocol === 'https:' ? true : false,
        forceAdminSSL = (isAdmin && config().forceAdminSSL);
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
            var forceAdminSSL = config().forceAdminSSL,
                redirectUrl;

            // Check if forceAdminSSL: { redirect: false } is set, which means
            // we should just deny non-SSL access rather than redirect
            if (forceAdminSSL && forceAdminSSL.redirect !== undefined && !forceAdminSSL.redirect) {
                return res.send(403);
            }

            redirectUrl = url.parse(config().urlSSL || config().url);
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

// Check to see if we should use Profanity filters
// and modify req as needed
function checkProfanity(req, res, next) {
    api.settings.read({key: 'profanity'}).then(function (response) {
        var profanity = response.settings[0];
        if (profanity.value === 'true') {
            middleware.profanity.init(req, res, next);
        } else
            next(); //no profanity to filter
    }).otherwise(function (err) {
        //pass on the error
        next(err);
    });
}

// ### Robots Middleware
// Handle requests to robots.txt and cache file
function robots() {
    var content, // file cache
        filePath = path.join(config().paths.corePath, '/shared/robots.txt');

    return function robots(req, res, next) {
        if ('/robots.txt' === req.url) {
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
                            'Content-Type': 'text/plain',
                            'Content-Length': buf.length,
                            'Cache-Control': 'public, max-age=' + ONE_YEAR_MS / 1000
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

module.exports = function (server, dbHash) {
    var logging = config().logging,
        subdir = config().paths.subdir,
        corePath = config().paths.corePath,
        cookie;

    // Cache express server instance
    expressServer = server;
    middleware.cacheServer(expressServer);

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
    expressServer.use(subdir, favicon(corePath + '/shared/favicon.ico'));

    // Static assets
    expressServer.use(subdir + '/shared', express['static'](path.join(corePath, '/shared'), {maxAge: ONE_HOUR_MS}));
    expressServer.use(subdir + '/content/images', storage.get_storage().serve());
    expressServer.use(subdir + '/ghost/scripts', express['static'](path.join(corePath, '/built/scripts'), {maxAge: ONE_YEAR_MS}));
    expressServer.use(subdir + '/public', express['static'](path.join(corePath, '/built/public'), {maxAge: ONE_YEAR_MS}));

    // First determine whether we're serving admin or theme content
    expressServer.use(updateActiveTheme);
    expressServer.use(decideContext);

    // Admin only config
    expressServer.use(subdir + '/ghost', middleware.whenEnabled('admin', express['static'](path.join(corePath, '/clientold/assets'), {maxAge: ONE_YEAR_MS})));
    expressServer.use(subdir + '/ghost/ember', middleware.whenEnabled('admin', express['static'](path.join(corePath, '/client/assets'), {maxAge: ONE_YEAR_MS})));

    // Force SSL
    // NOTE: Importantly this is _after_ the check above for admin-theme static resources,
    //       which do not need HTTPS. In fact, if HTTPS is forced on them, then 404 page might
    //       not display properly when HTTPS is not available!
    expressServer.use(checkSSL);

    // Theme only config
    expressServer.use(subdir, middleware.staticTheme());

    // Serve robots.txt if not found in theme
    expressServer.use(robots());

    // Add in all trailing slashes
    expressServer.use(slashes(true, {headers: {'Cache-Control': 'public, max-age=' + ONE_YEAR_S}}));

    // Body parsing
    expressServer.use(bodyParser.json());
    expressServer.use(bodyParser.urlencoded());

    // ### Sessions
    // we need the trailing slash in the cookie path. Session handling *must* be after the slash handling
    cookie = {
        path: subdir + '/ghost/',
        maxAge: 12 * ONE_HOUR_MS
    };

    // if SSL is forced, add secure flag to cookie
    // parameter is true, since cookie is used with admin only
    if (isSSLrequired(true)) {
        cookie.secure = true;
    }

    expressServer.use(cookieParser());
    expressServer.use(session({
        store: new BSStore(),
        proxy: true,
        secret: dbHash,
        cookie: cookie
    }));

    // ### Caching
    expressServer.use(middleware.cacheControl('public'));
    expressServer.use(subdir + '/api/', middleware.cacheControl('private'));
    expressServer.use(subdir + '/ghost/', middleware.cacheControl('private'));


    // enable authentication; has to be done before CSRF handling
    expressServer.use(middleware.authenticate);

    // enable express csrf protection
    expressServer.use(middleware.conditionalCSRF);

    // local data
    expressServer.use(ghostLocals);

    // So on every request we actually clean out redundant passive notifications from the server side
    // ToDo: Remove when ember handles passive notifications.
    expressServer.use(middleware.cleanNotifications);

    //profanity
    expressServer.use(checkProfanity);
    
    // ### Routing
    // Set up API routes
    expressServer.use(subdir, routes.api(middleware));

    // Set up Admin routes
    expressServer.use(subdir, routes.admin(middleware));

    // Set up Frontend routes
    expressServer.use(subdir, routes.frontend());

    // ### Error handling
    // 404 Handler
    expressServer.use(errors.error404);

    // 500 Handler
    expressServer.use(errors.error500);
};

// Export middleware functions directly
module.exports.middleware = middleware;
// Expose middleware functions in this file as well
module.exports.middleware.redirectToSignup = redirectToSignup;
