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
        BookshelfDataProvider = require('./shared/models/dataProvider.bookshelf'),
        bookshelfDataProvider = new BookshelfDataProvider(),
        ExampleFilter = require('../content/plugins/exampleFilters'),
        Ghost,
        instance,
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
            plugin,
            polyglot;


        if (!instance) {
            instance = this;
            plugin = new ExampleFilter(instance).init();

            /**
             * Save the global bits here so that it can
             * be reused in app.js
             * @author javorszky (blame me)
             */
            jsonDataProvider.save(config.blogData);
            jsonDataProvider.findAll(function (error, data) {
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
                plugin: function() { return plugin; },
                paths: function () {
                    return {
                        'activeTheme':   __dirname + '/../content/' + config.themeDir + '/' + config.activeTheme + '/',
                        'adminViews':    __dirname + '/admin/views/',
                        'frontendViews': __dirname + '/frontend/views/',
                        'lang':          __dirname + '/lang/'
                    };
                }
            });
        }
        return instance;
    };

    /**
     * Holds the filters
     * @type {Array}
     */
    Ghost.prototype.filterCallbacks = [];

    /**
     * Holds the filter hooks (that are built in to Ghost Core)
     * @type {Array}
     */
    Ghost.prototype.filters = [];

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
    Ghost.prototype.registerTheme = function (name, fn) {
        return this;
    };

    /**
     * @param  {string}   name
     * @param  {Function} fn
     * @return {*}
     */
    Ghost.prototype.registerPlugin = function (name, fn) {
        return this;
    };

    /**
     * @param  {string}   name
     * @param  {Function} fn
     */
    Ghost.prototype.registerFilter = function (name, fn) {
        if (!this.filterCallbacks.hasOwnProperty(name)) {
            this.filterCallbacks[name] = [];
        }
        console.log('registering filter for ', name);
        this.filterCallbacks[name].push(fn);
    };

    /**
     * @param  {string}   name     [description]
     * @param  {*}   args
     * @param  {Function} callback
     * @return {method} callback
     */
    Ghost.prototype.doFilter = function (name, args, callback) {
        var fn;

        if (this.filterCallbacks.hasOwnProperty(name)) {
            for (fn in this.filterCallbacks[name]) {
                if (this.filterCallbacks[name].hasOwnProperty(fn)) {
                    console.log('doing filter for ', name);
                    args = this.filterCallbacks[name][fn](args);
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