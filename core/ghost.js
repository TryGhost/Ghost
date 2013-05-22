// # Ghost Module

// Defines core methods required to build the frontend

// ## Node Modules
var express = require('express'),
    path = require('path'),
    hbs = require('express-hbs'),
    _ = require('underscore'),
    Polyglot = require('node-polyglot');

// ## App Requires
var config = require('./../config'),
    JsonDataProvider = require('./shared/models/dataProvider.json'),
    jsonDataProvider = new JsonDataProvider(),
    BookshelfDataProvider = require('./shared/models/dataProvider.bookshelf'),
    bookshelfDataProvider = new BookshelfDataProvider(),
    instance,
    filterCallbacks = {};

// ## Article Statuses

// Should these be defined in a language file, or elsewhere in maybe 
// a file with a bunch of objects that will be required and re-used on the 
// frontend and backend?
exports.statuses = {
    'draft': 'draft',
    'complete': 'complete',
    'approved': 'approved',
    'scheduled': 'scheduled',
    'published': 'published'
};

// might make sense for this to be grouped in with config to make it more flexible, easier to access,
// move directories around... just a thought.
var paths = exports.paths = {
    'activeTheme':  __dirname + '/../content/' + config.themeDir + '/' + config.activeTheme + '/',
    'adminViews':   __dirname + '/admin/views/',
    'lang':         __dirname + '/lang/'
};

// Require necessary config for the app
var config = exports.config = require('./../config');

// Create the express app, and make it publically accessible.
var app = exports.app = express();

// Why abstract the dataProvider already?... isn't that what the ORM layer is sort of for (at least
// for abstracting the different sql dialects)... seems it'd be easier if we start with keeping things
// simple and then worry about portability with other no-sql stores later.
var dataProvider = exports.dataProvider = function () {
    return bookshelfDataProvider;
};

// Expose a polyglot instance cached globally.
exports.polyglot = new Polyglot();

// Temporary loading of settings
jsonDataProvider.globals.findAll(function (error, data) {
    globals = data;
});

// Additional Helper methods for the core ghost object
// -------

exports.registerThemeHelper = function (name, fn) {
    hbs.registerHelper(name, fn);
};

exports.registerTheme = function (name, fn) {};

exports.registerPlugin = function (name, fn) {};

exports.registerFilter = function (name, fn) {
    if (!_.has(filterCallbacks, name)) {
        filterCallbacks[name] = [];
    }
    filterCallbacks[name].push(fn);
};

// Do Filter?
exports.doFilter = function (name, args, callback) {
    if (_.has(filterCallbacks, name)) {
        for (var fn in filterCallbacks[name]) {
            if (_.has(filterCallbacks[name], fn)) {
                args = filterCallbacks[name][fn](args);
            }
        }
    }
    callback(args);
};

// Initialise Theme
exports.initTheme = function (app) {
    return function initTheme(req, res, next) {
        app.set('view engine', 'hbs');

        if (/(^\/ghost$|^\/ghost\/)/.test(req.url) === false) {
            app.engine('hbs', hbs.express3(
                {partialsDir: paths.activeTheme + 'partials'}
            ));
            app.set('views', paths.activeTheme);
        } else {
            app.engine('hbs', hbs.express3({partialsDir: paths.adminViews + 'partials'}));
            app.set('views', paths.adminViews);
            app.use('/core/admin/assets', express['static'](path.join(__dirname, '/admin/assets')));
        }
        app.use(express['static'](paths.activeTheme));
        app.use('/content/images', express['static'](path.join(__dirname, '/../content/images')));

        next();
    };
};