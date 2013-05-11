// # Ghost main app file

/*global require */
(function () {
    "use strict";

    // Module dependencies.
    var express = require('express'),
        fs = require('fs'),
        admin = require('./core/admin/controllers'),
        frontend = require('./core/frontend/controllers'),
        flash = require('connect-flash'),
        Ghost = require('./core/ghost'),
        I18n = require('./core/lang/i18n'),
        helpers = require('./core/frontend/helpers'),
        auth,

    // ## Variables
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
        ghost.app().use(express.session({ cookie: { maxAge: 60000 }}));
        ghost.app().use(flash());
        ghost.app().use(ghost.initTheme(ghost.app()));
    });

    /**
     * Setup login details
     * p.s. love it.
     *
     * @type {*}
     */
    auth = express.basicAuth('ghostadmin', 'Wh0YouGonnaCall?');

    helpers.loadCoreHelpers(ghost);


    /**
     * API routes..
     * @todo convert these into a RESTful, public, authenticated API!
     */
    ghost.app().post('/api/v0.1/posts/create', auth, admin.posts.create);
    ghost.app().post('/api/v0.1/posts/edit', auth, admin.posts.edit);
    ghost.app().get('/api/v0.1/posts', auth, admin.posts.index);

    /**
     * Admin routes..
     * @todo put these somewhere in admin
     */
    ghost.app().get('/ghost/editor/:id', auth, admin.editor);
    ghost.app().get('/ghost/editor', auth, admin.editor);
    ghost.app().get('/ghost/blog', auth, admin.blog);
    ghost.app().get('/ghost/settings', auth, admin.settings);
    ghost.app().get('/ghost/debug', auth, admin.debug.index);
    ghost.app().get('/ghost/debug/db/delete/', auth, admin.debug.dbdelete);
    ghost.app().get('/ghost/debug/db/populate/', auth, admin.debug.dbpopulate);
    ghost.app().get('/ghost', auth, admin.index);

    /**
     * Frontend routes..
     * @todo dynamic routing, homepage generator, filters ETC ETC
     */
    ghost.app().get('/:slug', frontend.single);
    ghost.app().get('/', frontend.homepage);


    ghost.app().listen(3333, function () {
        console.log("Express server listening on port " + 3333);
        console.log('process: ', process.env);
    });
}());