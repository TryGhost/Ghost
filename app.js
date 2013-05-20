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
        Ghost = require('./core/ghost'),
        I18n = require('./core/lang/i18n'),
        helpers = require('./core/frontend/helpers'),

    // ## Variables
        auth,

        /**
         * Create new Ghost object
         * @type {Ghost}
         */
        ghost = new Ghost();

    ghost.app().configure('development', function () {
        ghost.app().use(express.favicon(__dirname + '/content/images/favicon.ico'));
        ghost.app().use(express.errorHandler());
        ghost.app().use(I18n.load(ghost));
        ghost.app().use(express.bodyParser());
        ghost.app().use(express.cookieParser('try-ghost'));
        ghost.app().use(express.cookieSession({ cookie: { maxAge: 60000 }}));
        ghost.app().use(ghost.initTheme(ghost.app()));
        ghost.app().use(flash());
        // bind locals - options which appear in every view - perhaps this should be admin only
        ghost.app().use(function (req, res, next) {
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
        } else {
            next();
        }
    };

    helpers.loadCoreHelpers(ghost);


    /**
     * API routes..
     * @todo auth should be public auth not user auth
     */
    ghost.app().get('/api/v0.1/posts', auth, api.requestHandler(api.posts.browse));
    ghost.app().get('/api/v0.1/posts/:id', auth, api.requestHandler(api.posts.read));
    ghost.app().post('/api/v0.1/posts/create', auth, api.requestHandler(api.posts.add));
    ghost.app().put('/api/v0.1/posts/edit', auth, api.requestHandler(api.posts.edit));
    ghost.app()['delete']('/api/v0.1/posts/:id', auth, api.requestHandler(api.posts.destroy));

    /**
     * Admin routes..
     * @todo put these somewhere in admin
     */

    ghost.app().get(/^\/logout\/?$/, admin.logout);
    ghost.app().get('/ghost/login/', admin.login);
    ghost.app().post('/ghost/login/', admin.auth);
    ghost.app().get('/ghost/editor/:id', auth, admin.editor);
    ghost.app().get('/ghost/editor', auth, admin.editor);
    ghost.app().get('/ghost/blog', auth, admin.blog);
    ghost.app().get('/ghost/settings', auth, admin.settings);
    ghost.app().get('/ghost/debug', auth, admin.debug.index);
    ghost.app().get('/ghost/debug/db/delete/', auth, admin.debug.dbdelete);
    ghost.app().get('/ghost/debug/db/populate/', auth, admin.debug.dbpopulate);
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


    ghost.app().listen(3333, function () {
        console.log("Express server listening on port " + 3333);
    });
}());