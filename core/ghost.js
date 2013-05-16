// # Ghost Module
// Defines core methods required to build the frontend

/*global module, require, __dirname */
(function () {
    "use strict";

    // ## Setup Prerequisites
    var config = require('./../config'),
        express = require('express'),
        path = require('path'),
        hbs = require('express-hbs'),
        _ = require('underscore'),
        Polyglot = require('node-polyglot'),

        JsonDataProvider = require('./shared/models/dataProvider.json'),
        jsonDataProvider = new JsonDataProvider(),
//        JugglingDataProvider = require('./shared/models/dataProvider.juggling'),
//        jugglingDataProvider = new JugglingDataProvider(),
        BookshelfDataProvider = require('./shared/models/dataProvider.bookshelf'),
        bookshelfDataProvider = new BookshelfDataProvider(),
        Ghost,
        instance,
        filterCallbacks = {},

        statuses;

    // ## Article Statuses
    /**
     * A list of atricle status types
     * @type {Object}
     */
    statuses = {
        'draft': 'draft',
        'complete': 'complete',
        'approved': 'approved',
        'scheduled': 'scheduled',
        'published': 'published'
    };

    // ## Module Methods
    /**
     * @method Ghost
     * @returns {*}
     * @constructor
     */
    Ghost = function () {
        var app,
            globals,
            polyglot;

        if (!instance) {
            instance = this;

            // Temporary loading of settings
            jsonDataProvider.globals.findAll(function (error, data) {
                globals = data;
            });

            app = express();

            polyglot = new Polyglot();

            // functionality
            // load Plugins...
            // var f = new FancyFirstChar(ghost).init();

            _.extend(instance, {
                app: function () { return app; },
                config: function () { return config; },
                globals: function () { return globals; }, // there's no management here to be sure this has loaded
                dataProvider: function () { return bookshelfDataProvider; },
                statuses: function () { return statuses; },
                polyglot: function () { return polyglot; },
                paths: function () {
                    return {
                        'activeTheme':  __dirname + '/../content/' + config.themeDir + '/' + config.activeTheme + '/',
                        'adminViews':   __dirname + '/admin/views/',
                        'lang':         __dirname + '/lang/'
                    };
                }
            });
        }

        return instance;
    };

    /**
     * @param  {string}   name
     * @param  {Function} fn
     * @return {method}  hbs.registerHelper
     */
    Ghost.prototype.registerThemeHelper = function (name, fn) {
        hbs.registerHelper(name, fn);
    };

    /**
     * @param  {string}   name
     * @param  {Function} fn
     * @return {*}
     */
    Ghost.prototype.registerTheme = function (name, fn) {};

    /**
     * @param  {string}   name
     * @param  {Function} fn
     * @return {*}
     */
    Ghost.prototype.registerPlugin = function (name, fn) {};

    /**
     * @param  {string}   name
     * @param  {Function} fn
     */
    Ghost.prototype.registerFilter = function (name, fn) {
        if (!filterCallbacks.hasOwnProperty(name)) {
            filterCallbacks[name] = [];
        }
        console.log('registering filter for ', name);
        filterCallbacks[name].push(fn);
    };

    /**
     * @param  {string}   name     [description]
     * @param  {*}   args
     * @param  {Function} callback
     * @return {method} callback
     */
    Ghost.prototype.doFilter = function (name, args, callback) {
        var fn;

        if (filterCallbacks.hasOwnProperty(name)) {
            for (fn in filterCallbacks[name]) {
                if (filterCallbacks[name].hasOwnProperty(fn)) {
                    console.log('doing filter for ', name);
                    args = filterCallbacks[name][fn](args);
                }
            }
        }
        callback(args);
    };

    /**
     * Initialise Theme
     *
     * @todo  Tod (?) Old comment
     * @param  {Object} app
     */
    Ghost.prototype.initTheme = function (app) {
        var self = this;
        return function initTheme(req, res, next) {
            app.set('view engine', 'hbs');

            if (/(^\/ghost$|^\/ghost\/)/.test(req.url) === false) {
                app.engine('hbs', hbs.express3(
                    {partialsDir: self.paths().activeTheme + 'partials'}
                ));
                app.set('views', self.paths().activeTheme);
            } else {
                app.engine('hbs', hbs.express3({partialsDir: self.paths().adminViews + 'partials'}));
                app.set('views', self.paths().adminViews);
                app.use('/core/admin/assets', express['static'](path.join(__dirname, '/admin/assets')));
            }
            app.use(express['static'](self.paths().activeTheme));
            app.use('/content/images', express['static'](path.join(__dirname, '/../content/images')));

            next();
        };
    };

    module.exports = Ghost;
}());