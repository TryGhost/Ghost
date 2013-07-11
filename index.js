// # Ghost main app file

// Module dependencies.
var express = require('express'),
    when = require('when'),
    _ = require('underscore'),
    errors = require('./core/server/errorHandling'),
    admin = require('./core/server/controllers/admin'),
    frontend = require('./core/server/controllers/frontend'),
    api = require('./core/server/api'),
    flash = require('connect-flash'),
    Ghost = require('./core/ghost'),
    I18n = require('./core/shared/lang/i18n'),
    filters = require('./core/server/filters'),
    helpers = require('./core/server/helpers'),

// ## Custom Middleware
    auth,
    authAPI,
    isGhostAdmin,
    ghostLocals,
    disableCachedResult,

// ## Variables
    loading = when.defer(),

    /**
     * Create new Ghost object
     * @type {Ghost}
     */
    ghost = new Ghost();


/**
 * Authenticate a request by redirecting to login if not logged in
 * We strip /ghost/ out of the redirect parameter for neatness
 *
 * @type {*}
 */
auth = function (req, res, next) {
    if (!req.session.user) {
        var path = req.path.replace(/^\/ghost\/?/gi, ''),
            redirect = '';

        if (path !== '') {
            req.flash('warn', "Please login");
            redirect = '?r=' + encodeURIComponent(path);
        }

        return res.redirect('/ghost/login/' + redirect);
    }

    next();
};

/**
 * Authenticate a request by responding with a 401 and json error details
 *
 * @type {*}
 */
authAPI = function (req, res, next) {
    if (!req.session.user) {
        // TODO: standardize error format/codes/messages
        var err = { code: 42, message: 'Please login' };
        res.json(401, { error: err });
        return;
    }
    next();
};

// #### isGhostAdmin
// Middleware which uses the URL to detect whether this response should be an admin response
// This is used to ensure the right content is served, and is not for security purposes
isGhostAdmin = function (req, res, next) {
    res.isAdmin = /(^\/ghost$|^\/ghost\/)/.test(req.url);

    next();
};

// Expose the standard locals that every external page should have available,
// separating between the frontend / theme and the admin
ghostLocals = function (req, res, next) {
    // Make sure we have a locals value.
    res.locals = res.locals || {};

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
        _.extend(res.locals,  {
            // pass the admin flash messages, settings and paths
            messages: req.flash(),
            settings: ghost.settings(),
            availableThemes: ghost.paths().availableThemes,
            availablePlugins: ghost.paths().availablePlugins
        });

        next();
    }
};

// Disable any caching until it can be done properly
disableCachedResult = function (req, res, next) {
    res.set({
        "Cache-Control": "no-cache, must-revalidate",
        "Expires": "Sat, 26 Jul 1997 05:00:00 GMT"
    });

    next();
};

ghost.app().configure('development', function () {
    ghost.app().use(isGhostAdmin);
    ghost.app().use(express.favicon(__dirname + '/content/images/favicon.ico'));
    ghost.app().use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    ghost.app().use(express.logger('dev'));
    ghost.app().use(I18n.load(ghost));
    ghost.app().use(express.bodyParser({}));
    ghost.app().use(express.cookieParser('try-ghost'));
    ghost.app().use(express.cookieSession({ cookie: { maxAge: 60000000 }}));
    ghost.app().use(ghost.initTheme(ghost.app()));
    ghost.app().use(flash());
});


// Expose the promise we will resolve after our pre-loading
ghost.loaded = loading.promise;

when.all([ghost.init(), filters.loadCoreFilters(ghost), helpers.loadCoreHelpers(ghost)]).then(function () {

    // post init config
    ghost.app().use(ghostLocals);

    /**
     * API routes..
     * @todo auth should be public auth not user auth
     */
    ghost.app().get('/api/v0.1/posts', authAPI, disableCachedResult, api.requestHandler(api.posts.browse));
    ghost.app().post('/api/v0.1/posts', authAPI, disableCachedResult, api.requestHandler(api.posts.add));
    ghost.app().get('/api/v0.1/posts/:id', authAPI, disableCachedResult, api.requestHandler(api.posts.read));
    ghost.app().put('/api/v0.1/posts/:id', authAPI, disableCachedResult, api.requestHandler(api.posts.edit));
    ghost.app().del('/api/v0.1/posts/:id', authAPI, disableCachedResult, api.requestHandler(api.posts.destroy));
    ghost.app().get('/api/v0.1/settings', authAPI, disableCachedResult, api.cachedSettingsRequestHandler(api.settings.browse));
    ghost.app().get('/api/v0.1/settings/:key', authAPI, disableCachedResult, api.cachedSettingsRequestHandler(api.settings.read));
    ghost.app().put('/api/v0.1/settings', authAPI, disableCachedResult, api.cachedSettingsRequestHandler(api.settings.edit));

    /**
     * Admin routes..
     * @todo put these somewhere in admin
     */
    ghost.app().get(/^\/logout\/?$/, admin.logout);
    ghost.app().get('/ghost/login/', admin.login);
    ghost.app().get('/ghost/signup/', admin.signup);
    ghost.app().post('/ghost/login/', admin.auth);
    ghost.app().post('/ghost/signup/', admin.doRegister);
    ghost.app().get('/ghost/editor/:id', auth, admin.editor);
    ghost.app().get('/ghost/editor', auth, admin.editor);
    ghost.app().get('/ghost/content', auth, admin.content);
    ghost.app().get('/ghost/settings*', auth, admin.settings);
    ghost.app().get('/ghost/debug', auth, admin.debug.index);
    ghost.app().get('/ghost/debug/db/export/', auth, admin.debug['export']);
    ghost.app().post('/ghost/debug/db/import/', auth, admin.debug.import);
    ghost.app().get('/ghost/debug/db/reset/', auth, admin.debug.reset);
    ghost.app().get(/^\/(ghost$|(ghost-admin|admin|wp-admin|dashboard|login)\/?)/, auth, function (req, res) {
        res.redirect('/ghost/');
    });
    ghost.app().get('/ghost/', auth, admin.index);

    /**
     * Frontend routes..
     * @todo dynamic routing, homepage generator, filters ETC ETC
     */
    ghost.app().get('/:slug', frontend.single);
    ghost.app().get('/', frontend.homepage);
    ghost.app().get('/page/:page/', frontend.homepage);



    ghost.app().listen(
        ghost.config().env[process.env.NODE_ENV || 'development'].url.port,
        ghost.config().env[process.env.NODE_ENV || 'development'].url.host,
        function () {
            console.log("Express server listening on address:",
                ghost.config().env[process.env.NODE_ENV || 'development'].url.host + ':'
                    + ghost.config().env[process.env.NODE_ENV || 'development'].url.port);

            // Let everyone know we have finished loading
            loading.resolve();
        }
    );

}, errors.logAndThrowError);
