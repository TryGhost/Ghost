// # Ghost main app file
// Contains the app configuration and all of the routing

// If no env is set, default to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Module dependencies
var express = require('express'),
    when = require('when'),
    _ = require('underscore'),
    colors = require("colors"),
    semver = require("semver"),
    errors = require('./core/server/errorHandling'),
    admin = require('./core/server/controllers/admin'),
    frontend = require('./core/server/controllers/frontend'),
    api = require('./core/server/api'),
    Ghost = require('./core/ghost'),
    I18n = require('./core/shared/lang/i18n'),
    filters = require('./core/server/filters'),
    helpers = require('./core/server/helpers'),
    packageInfo = require('./package.json'),
    Validator = require('validator').Validator,
    v = new Validator(),

// Variables
    loading = when.defer(),
    ghost = new Ghost();

v.error = function () {
    return false;
};

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
                message: 'Please Log In',
                status: 'passive',
                id: 'failedauth'
            };
            // let's only add the notification once
            if (!_.contains(_.pluck(ghost.notifications, 'id'), 'failedauth')) {
                ghost.notifications.push(msg);
            }
            redirect = '?r=' + encodeURIComponent(path);
        }
        return res.redirect('/ghost/login/' + redirect);
    }

    next();
}


// While we're here, let's clean up on aisle 5
// That being ghost.notifications, and let's remove the passives from there
// plus the local messages, as the have already been added at this point
// otherwise they'd appear one too many times
function cleanNotifications(req, res, next) {
    ghost.notifications = _.reject(ghost.notifications, function (notification) {
        return notification.status === 'passive';
    });
    next();
}


/**
 * Validation middleware
 * Checks on signup whether email is actually a valid email address
 * and if password is at least 8 characters long
 *
 * To change validation rules, see https://github.com/chriso/node-validator
 *
 * @author  javorszky
 * @issue   https://github.com/TryGhost/Ghost/issues/374
 */
function signupValidate(req, res, next) {
    var email = req.body.email,
        password = req.body.password;


    if (!v.check(email).isEmail()) {
        res.json(401, {error: "Please check your email address. It does not seem to be valid."});
        return;
    }
    if (!v.check(password).len(8)) {
        res.json(401, {error: 'Your password is not long enough. It must be at least 8 chars long.'});
        return;
    }
    next();
}

// ## AuthApi Middleware
// Authenticate a request to the API by responding with a 401 and json error details
function authAPI(req, res, next) {
    if (!req.session.user) {
        // TODO: standardize error format/codes/messages
        var err = { code: 42, message: 'Please login' };
        res.json(401, { error: err });
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

    if (!res.isAdmin) {
        // filter the navigation items
        ghost.doFilter('ghostNavItems', {path: req.path, navItems: []}, function (navData) {
            // pass the theme navigation items and settings
            _.extend(res.locals, navData, {
                settings: ghost.settings()
            });

            next();
        });
    } else {
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

// ##Configuration
ghost.app().configure(function () {
    ghost.app().use(isGhostAdmin);
    ghost.app().use(express.favicon(__dirname + '/content/images/favicon.ico'));
    ghost.app().use(I18n.load(ghost));
    ghost.app().use(express.bodyParser({}));
    ghost.app().use(express.bodyParser({uploadDir: __dirname + '/content/images'}));
    ghost.app().use(express.cookieParser('try-ghost'));
    ghost.app().use(express.cookieSession({ cookie: { maxAge: 60000000 }}));
    ghost.app().use(ghost.initTheme(ghost.app()));

    if (process.env.NODE_ENV !== "development") {
        ghost.app().use(express.logger());
        ghost.app().use(express.errorHandler({ dumpExceptions: false, showStack: false }));
    }
});

// Development only configuration
ghost.app().configure("development", function () {
    ghost.app().use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    ghost.app().use(express.logger('dev'));
});


// Expose the promise we will resolve after our pre-loading
ghost.loaded = loading.promise;

when.all([ghost.init(), filters.loadCoreFilters(ghost), helpers.loadCoreHelpers(ghost)]).then(function () {

    // post init config
    ghost.app().use(ghostLocals);
    // because science
    ghost.app().use(cleanNotifications);


    // ## Routing

    // ### API routes
    /* TODO: auth should be public auth not user auth */
    // #### Posts
    ghost.app().get('/api/v0.1/posts', authAPI, disableCachedResult, api.requestHandler(api.posts.browse));
    ghost.app().post('/api/v0.1/posts', authAPI, disableCachedResult, api.requestHandler(api.posts.add));
    ghost.app().get('/api/v0.1/posts/:id', authAPI, disableCachedResult, api.requestHandler(api.posts.read));
    ghost.app().put('/api/v0.1/posts/:id', authAPI, disableCachedResult, api.requestHandler(api.posts.edit));
    ghost.app().del('/api/v0.1/posts/:id', authAPI, disableCachedResult, api.requestHandler(api.posts.destroy));
    // #### Settings
    ghost.app().get('/api/v0.1/settings', authAPI, disableCachedResult, api.cachedSettingsRequestHandler(api.settings.browse));
    ghost.app().get('/api/v0.1/settings/:key', authAPI, disableCachedResult, api.cachedSettingsRequestHandler(api.settings.read));
    ghost.app().put('/api/v0.1/settings', authAPI, disableCachedResult, api.cachedSettingsRequestHandler(api.settings.edit));
    // #### Users
    ghost.app().get('/api/v0.1/users', authAPI, disableCachedResult, api.requestHandler(api.users.browse));
    ghost.app().get('/api/v0.1/users/:id', authAPI, disableCachedResult, api.requestHandler(api.users.read));
    ghost.app().put('/api/v0.1/users/:id', authAPI, disableCachedResult, api.requestHandler(api.users.edit));
    // #### Notifications
    ghost.app().del('/api/v0.1/notifications/:id', authAPI, disableCachedResult, api.requestHandler(api.notifications.destroy));
    ghost.app().post('/api/v0.1/notifications/', authAPI, disableCachedResult, api.requestHandler(api.notifications.add));


    // ### Admin routes
    /* TODO: put these somewhere in admin */
    ghost.app().get(/^\/logout\/?$/, admin.logout);
    ghost.app().get('/ghost/login/', admin.login);
    ghost.app().get('/ghost/signup/', admin.signup);
    ghost.app().post('/ghost/login/', signupValidate, admin.auth);
    ghost.app().post('/ghost/signup/', signupValidate, admin.doRegister);
    ghost.app().post('/ghost/changepw/', auth, admin.changepw);
    ghost.app().get('/ghost/editor/:id', auth, admin.editor);
    ghost.app().get('/ghost/editor', auth, admin.editor);
    ghost.app().get('/ghost/content', auth, admin.content);
    ghost.app().get('/ghost/settings*', auth, admin.settings);
    ghost.app().get('/ghost/debug/', auth, admin.debug.index);
    ghost.app().get('/ghost/debug/db/export/', auth, admin.debug['export']);
    ghost.app().post('/ghost/debug/db/import/', auth, admin.debug['import']);
    ghost.app().get('/ghost/debug/db/reset/', auth, admin.debug.reset);
    ghost.app().post('/ghost/upload', admin.uploader);
    ghost.app().get(/^\/(ghost$|(ghost-admin|admin|wp-admin|dashboard|login)\/?)/, auth, function (req, res) {
        res.redirect('/ghost/');
    });
    ghost.app().get('/ghost/', auth, admin.index);

    // ### Frontend routes
    /* TODO: dynamic routing, homepage generator, filters ETC ETC */
    ghost.app().get('/:slug', frontend.single);
    ghost.app().get('/', frontend.homepage);
    ghost.app().get('/page/:page/', frontend.homepage);


    // ## Start Ghost App
    ghost.app().listen(
        ghost.config().env[process.env.NODE_ENV || 'development'].url.port,
        ghost.config().env[process.env.NODE_ENV || 'development'].url.host,
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
                ghost.config().env[process.env.NODE_ENV || 'development'].url.host + ':'
                    + ghost.config().env[process.env.NODE_ENV || 'development'].url.port);

            // Let everyone know we have finished loading
            loading.resolve();
        }
    );
}, errors.logAndThrowError);
