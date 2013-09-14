// Module dependencies
var express = require('express'),
    when = require('when'),
    _ = require('underscore'),
    colors = require("colors"),
    semver = require("semver"),
    errors = require('./server/errorHandling'),
    admin = require('./server/controllers/admin'),
    frontend = require('./server/controllers/frontend'),
    api = require('./server/api'),
    Ghost = require('./ghost'),
    I18n = require('./shared/lang/i18n'),
    helpers = require('./server/helpers'),
    packageInfo = require('../package.json'),

// Variables
    loading = when.defer(),
    server = express(),
    ghost = new Ghost();

// ##Custom Middleware

// ### Auth Middleware
// Authenticate a request by redirecting to login if not logged in.
// We strip /ghost/ out of the redirect parameter for neatness
function auth(req, res, next) {
    if (!req.session.user) {
        var path = req.path.replace(/^\/ghost\/?/gi, ''),
            redirect = '',
            msg;

        if (path !== '') {
            msg = {
                type: 'error',
                message: 'Please Sign In',
                status: 'passive',
                id: 'failedauth'
            };
            // let's only add the notification once
            if (!_.contains(_.pluck(ghost.notifications, 'id'), 'failedauth')) {
                ghost.notifications.push(msg);
            }
            redirect = '?r=' + encodeURIComponent(path);
        }
        return res.redirect('/ghost/signin/' + redirect);
    }

    next();
}


// Check if we're logged in, and if so, redirect people back to dashboard
// Login and signup forms in particular
function redirectToDashboard(req, res, next) {
    if (req.session.user) {
        return res.redirect('/ghost/');
    }

    next();
}

function redirectToSignup(req, res, next) {
    api.users.browse().then(function (users) {
        if (users.length === 0) {
            return res.redirect('/ghost/signup/');
        }
    });

    next();
}

// While we're here, let's clean up on aisle 5
// That being ghost.notifications, and let's remove the passives from there
// plus the local messages, as they have already been added at this point
// otherwise they'd appear one too many times
function cleanNotifications(req, res, next) {
    ghost.notifications = _.reject(ghost.notifications, function (notification) {
        return notification.status === 'passive';
    });
    next();
}

// ## AuthApi Middleware
// Authenticate a request to the API by responding with a 401 and json error details
function authAPI(req, res, next) {
    if (!req.session.user) {
        // TODO: standardize error format/codes/messages
        res.json(401, { error: 'Please sign in' });
        return;
    }

    next();
}

// ### GhostAdmin Middleware
// Uses the URL to detect whether this response should be an admin response
// This is used to ensure the right content is served, and is not for security purposes
function isGhostAdmin(req, res, next) {
    res.isAdmin = /(^\/ghost$|^\/ghost\/)/.test(req.url);

    next();
}

// ### GhostLocals Middleware
// Expose the standard locals that every external page should have available,
// separating between the frontend / theme and the admin
function ghostLocals(req, res, next) {
    // Make sure we have a locals value.
    res.locals = res.locals || {};
    res.locals.version = packageInfo.version;

    if (res.isAdmin) {
        api.users.read({id: req.session.user}).then(function (currentUser) {
            _.extend(res.locals,  {
                // pass the admin flash messages, settings and paths
                messages: ghost.notifications,
                settings: ghost.settings(),
                availableThemes: ghost.paths().availableThemes,
                availablePlugins: ghost.paths().availablePlugins,
                currentUser: {
                    name: currentUser.attributes.full_name,
                    profile: currentUser.attributes.profile_picture
                }
            });
            next();
        }).otherwise(function () {
            _.extend(res.locals,  {
                // pass the admin flash messages, settings and paths
                messages: ghost.notifications,
                settings: ghost.settings(),
                availableThemes: ghost.paths().availableThemes,
                availablePlugins: ghost.paths().availablePlugins
            });
            next();
        });
    } else {
        next();
    }
}

// ### DisableCachedResult Middleware
// Disable any caching until it can be done properly
function disableCachedResult(req, res, next) {
    res.set({
        "Cache-Control": "no-cache, must-revalidate",
        "Expires": "Sat, 26 Jul 1997 05:00:00 GMT"
    });

    next();
}

// Expose the promise we will resolve after our pre-loading
ghost.loaded = loading.promise;

when.all([ghost.init(), helpers.loadCoreHelpers(ghost)]).then(function () {

    // ##Configuration
    server.configure(function () {
        server.use(isGhostAdmin);
        server.use(express.favicon(__dirname + '/core/shared/favicon.ico'));
        server.use(I18n.load(ghost));
        server.use(express.bodyParser({}));
        server.use(express.bodyParser({uploadDir: __dirname + '/content/images'}));
        server.use(express.cookieParser(ghost.dbHash));
        server.use(express.cookieSession({ cookie: { maxAge: 60000000 }}));
        server.use(ghost.initTheme(server));
        if (process.env.NODE_ENV !== "development") {
            server.use(express.logger());
            server.use(express.errorHandler({ dumpExceptions: false, showStack: false }));
        }
    });

    // Development only configuration
    server.configure("development", function () {
        server.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        server.use(express.logger('dev'));
    });

    // post init config
    server.use(ghostLocals);
    // So on every request we actually clean out reduntant passive notifications from the server side
    server.use(cleanNotifications);

    // ## Routing

    // ### API routes
    /* TODO: auth should be public auth not user auth */
    // #### Posts
    server.get('/api/v0.1/posts', authAPI, disableCachedResult, api.requestHandler(api.posts.browse));
    server.post('/api/v0.1/posts', authAPI, disableCachedResult, api.requestHandler(api.posts.add));
    server.get('/api/v0.1/posts/:id', authAPI, disableCachedResult, api.requestHandler(api.posts.read));
    server.put('/api/v0.1/posts/:id', authAPI, disableCachedResult, api.requestHandler(api.posts.edit));
    server.del('/api/v0.1/posts/:id', authAPI, disableCachedResult, api.requestHandler(api.posts.destroy));
    // #### Settings
    server.get('/api/v0.1/settings', authAPI, disableCachedResult, api.cachedSettingsRequestHandler(api.settings.browse));
    server.get('/api/v0.1/settings/:key', authAPI, disableCachedResult, api.cachedSettingsRequestHandler(api.settings.read));
    server.put('/api/v0.1/settings', authAPI, disableCachedResult, api.cachedSettingsRequestHandler(api.settings.edit));
    // #### Themes
    server.get('/api/v0.1/themes', authAPI, disableCachedResult, api.requestHandler(api.themes.browse));
    // #### Users
    server.get('/api/v0.1/users', authAPI, disableCachedResult, api.requestHandler(api.users.browse));
    server.get('/api/v0.1/users/:id', authAPI, disableCachedResult, api.requestHandler(api.users.read));
    server.put('/api/v0.1/users/:id', authAPI, disableCachedResult, api.requestHandler(api.users.edit));
    // #### Tags
    server.get('/api/v0.1/tags', authAPI, disableCachedResult, api.requestHandler(api.tags.all));
    // #### Notifications
    server.del('/api/v0.1/notifications/:id', authAPI, disableCachedResult, api.requestHandler(api.notifications.destroy));
    server.post('/api/v0.1/notifications/', authAPI, disableCachedResult, api.requestHandler(api.notifications.add));


    // ### Admin routes
    /* TODO: put these somewhere in admin */
    server.get(/^\/logout\/?$/, function redirect(req, res) {
        res.redirect(301, '/signout/');
    });
    server.get(/^\/signout\/?$/, admin.logout);
    server.get('/ghost/login/', function redirect(req, res) {
        res.redirect(301, '/ghost/signin/');
    });
    server.get('/ghost/signin/', redirectToSignup, redirectToDashboard, admin.login);
    server.get('/ghost/signup/', redirectToDashboard, admin.signup);
    server.get('/ghost/forgotten/', redirectToDashboard, admin.forgotten);
    server.post('/ghost/forgotten/', admin.resetPassword);
    server.post('/ghost/signin/', admin.auth);
    server.post('/ghost/signup/', admin.doRegister);
    server.post('/ghost/changepw/', auth, admin.changepw);
    server.get('/ghost/editor/:id', auth, admin.editor);
    server.get('/ghost/editor', auth, admin.editor);
    server.get('/ghost/content', auth, admin.content);
    server.get('/ghost/settings*', auth, admin.settings);
    server.get('/ghost/debug/', auth, admin.debug.index);
    server.get('/ghost/debug/db/export/', auth, admin.debug['export']);
    server.post('/ghost/debug/db/import/', auth, admin.debug['import']);
    server.get('/ghost/debug/db/reset/', auth, admin.debug.reset);
    server.post('/ghost/upload', admin.uploader);
    server.get(/^\/(ghost$|(ghost-admin|admin|wp-admin|dashboard|signin)\/?)/, auth, function (req, res) {
        res.redirect('/ghost/');
    });
    server.get('/ghost/', redirectToSignup, auth, admin.index);

    // ### Frontend routes
    /* TODO: dynamic routing, homepage generator, filters ETC ETC */
    server.get('/rss/', frontend.rss);
    server.get('/rss/:page/', frontend.rss);
    server.get('/:slug', frontend.single);
    server.get('/', frontend.homepage);
    server.get('/page/:page/', frontend.homepage);

    // Load the plugins with the already configured express server
    ghost.initPlugins(server).then(function () {

        // ## Start Ghost App
        server.listen(
            ghost.config().server.port,
            ghost.config().server.host,
            function () {

                // Tell users if their node version is not supported, and exit
                if (!semver.satisfies(process.versions.node, packageInfo.engines.node)) {
                    console.log(
                        "\n !!! INVALID NODE VERSION !!!\n".red,
                        "Ghost requires node version".red,
                        packageInfo.engines.node.yellow,
                        "as defined in package.json\n".red
                    );

                    process.exit(-1);
                }

                // Alpha warning, reminds users this is not production-ready software (yet)
                // Remove once software becomes suitably 'ready'
                console.log(
                    "\n !!! ALPHA SOFTWARE WARNING !!!\n".red,
                    "Ghost is in the early stages of development.\n".red,
                    "Expect to see bugs and other issues (but please report them.)\n".red
                );

                // Startup message
                console.log("Express server listening on address:",
                    ghost.config().server.host + ':'
                        + ghost.config().server.port);

                // Let everyone know we have finished loading
                loading.resolve();
            }
        );

    }, errors.logAndThrowError);
}, errors.logAndThrowError);
