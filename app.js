// # Ghost main app file

/*global require, __dirname */
(function () {
    "use strict";

    // Module dependencies.
    var express = require('express'),
        admin = require('./core/admin/controllers'),
        frontend = require('./core/frontend/controllers'),
        api = require('./core/shared/api'),
        flash = require('connect-flash'),
        ghost = require('./core/ghost'),
        I18n = require('./core/lang/i18n'),
        helpers = require('./core/frontend/helpers'),

        // ## Variables
        auth,
        authAPI,
        app = ghost.app();

    app.configure('development', function () {
        app.use(express.favicon(__dirname + '/content/images/favicon.ico'));
        app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
        app.use(express.logger('dev'));
        app.use(I18n.load(ghost));
        app.use(express.bodyParser());
        app.use(express.cookieParser('try-ghost'));
        app.use(express.cookieSession({ cookie: { maxAge: 60000000 }}));
        app.use(ghost.initTheme(app));
        app.use(flash());
        // bind locals - options which appear in every view - perhaps this should be admin only
        app.use(function (req, res, next) {
            res.locals.messages = req.flash();
            next();
        });
    });

    /**
     * Setup login details
     * p.s. love it.
     *
     * @type {*}
     */
    auth = function (req, res, next) {
        if (!req.session.user) {
            req.flash('warn', "Please login");
            res.redirect('/ghost/login/?redirect=' + encodeURIComponent(req.path));
            return;
        }
        next();
    };

    authAPI = function (req, res, next) {
        if (!req.session.user) {
            // TODO: standardize error format/codes/messages
            var err = { code: 42, message: 'Please login' };
            res.json(401, { error: err });
            return;
        }
        next();
    };

    helpers.loadCoreHelpers(ghost);


    /**
     * API routes..
     * @todo auth should be public auth not user auth
     */
    app.get('/api/v0.1/posts', authAPI, api.requestHandler(api.posts.browse));
    app.post('/api/v0.1/posts', authAPI, api.requestHandler(api.posts.add));
    app.get('/api/v0.1/posts/:id', authAPI, api.requestHandler(api.posts.read));
    app.put('/api/v0.1/posts/:id', authAPI, api.requestHandler(api.posts.edit));
    app.del('/api/v0.1/posts/:id', authAPI, api.requestHandler(api.posts.destroy));
    app.get('/api/v0.1/settings', authAPI, api.requestHandler(api.settings.browse));
    app.get('/api/v0.1/settings/:key', authAPI, api.requestHandler(api.settings.read));
    app.put('/api/v0.1/settings', authAPI, api.requestHandler(api.settings.edit));

    /**
     * Admin routes..
     * @todo put these somewhere in admin
     */

    app.get(/^\/logout\/?$/, admin.logout);
    app.get('/ghost/login/', admin.login);
    app.get('/ghost/register/', admin.register);
    app.post('/ghost/login/', admin.auth);
    app.post('/ghost/register/', admin.doRegister);
    app.get('/ghost/editor/:id', auth, admin.editor);
    app.get('/ghost/editor', auth, admin.editor);
    app.get('/ghost/blog', auth, admin.blog);
    app.get('/ghost/settings', auth, admin.settings);
    app.get('/ghost/debug', auth, admin.debug.index);
    app.get('/ghost/debug/db/delete/', auth, admin.debug.dbdelete);
    app.get('/ghost/debug/db/populate/', auth, admin.debug.dbpopulate);
    app.get(/^\/(ghost$|(ghost-admin|admin|wp-admin|dashboard|login)\/?)/, auth, function (req, res) {
        res.redirect('/ghost/');
    });
    app.get('/ghost/', auth, admin.index);

    /**
     * Frontend routes..
     * @todo dynamic routing, homepage generator, filters ETC ETC
     */
    app.get('/:slug', frontend.single);
    app.get('/', frontend.homepage);

    app.listen(3333, function () {
        console.log("Express server listening on port " + 3333);
    });
}());