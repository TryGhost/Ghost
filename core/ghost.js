// # Ghost Module
// Defines core methods required to build the application

// Module dependencies
var config = require('./../config'),
    when = require('when'),
    express = require('express'),
    errors = require('./server/errorHandling'),
    fs = require('fs'),
    path = require('path'),
    hbs = require('express-hbs'),
    nodefn = require('when/node/function'),
    _ = require('underscore'),
    Polyglot = require('node-polyglot'),
    models = require('./server/models'),
    plugins = require('./server/plugins'),
    requireTree = require('./server/require-tree'),
    permissions = require('./server/permissions'),
    uuid = require('node-uuid'),

// Variables
    appRoot = path.resolve(__dirname, '../'),
    themePath = path.resolve(appRoot + '/content/themes'),
    pluginPath = path.resolve(appRoot + '/content/plugins'),
    themeDirectories = requireTree(themePath),
    pluginDirectories = requireTree(pluginPath),

    Ghost,
    instance,
    defaults,
    statuses;

// ## Default values
/**
 * A hash of default values to use instead of 'magic' numbers/strings.
 * @type {Object}
 */
defaults = {
    filterPriority: 5,
    maxPriority: 9
};

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
        polyglot;

    if (!instance) {
        instance = this;

        // Holds the filters
        instance.filterCallbacks = [];

        // Holds the filter hooks (that are built in to Ghost Core)
        instance.filters = [];

        // Holds the theme directories temporarily
        instance.themeDirectories = {};

        // Holds the plugin directories temporarily
        instance.pluginDirectories = {};

        // Holds the persistent notifications
        instance.notifications = [];

        // Holds the available plugins
        instance.availablePlugins = {};

        // Holds the dbhash (mainly used for cookie secret)
        instance.dbHash = undefined;

        app = express();
        polyglot = new Polyglot();

        _.extend(instance, {
            app: function () { return app; },
            config: function () { return config; },

            // there's no management here to be sure this has loaded
            settings: function () { return instance.settingsCache; },
            dataProvider: models,
            statuses: function () { return statuses; },
            polyglot: function () { return polyglot; },
            getPaths: function () {
                return when.all([themeDirectories, pluginDirectories]).then(function (paths) {
                    instance.themeDirectories = paths[0];
                    instance.pluginDirectories = paths[1];
                    return;
                });
            },
            paths: function () {
                return {
                    'appRoot':          appRoot,
                    'themePath':        themePath,
                    'pluginPath':       pluginPath,
                    'activeTheme':      path.join(appRoot, !instance.settingsCache ? "" : instance.settingsCache.activeTheme),
                    'adminViews':       path.join(appRoot, '/core/server/views/'),
                    'helperTemplates':  path.join(appRoot, '/core/server/helpers/tpl/'),
                    'lang':             path.join(appRoot, '/core/shared/lang/'),
                    'availableThemes':  instance.themeDirectories,
                    'availablePlugins': instance.pluginDirectories
                };
            }
        });
    }
    return instance;
};

// Initialise the application
Ghost.prototype.init = function () {
    var self = this;

    return when.join(instance.dataProvider.init(), instance.getPaths()).then(function () {
        // Initialize plugins
        return self.initPlugins();
    }).then(function () {
        // Initialize the settings cache
        return self.updateSettingsCache();
    }).then(function () {
        // Initialize the permissions actions and objects
        return permissions.init();
    }).then(function () {
        // get the settings and whatnot
        return when(models.Settings.read('dbHash')).then(function (dbhash) {
            // we already ran this, chill
            self.dbHash = dbhash.attributes.value;
            return dbhash.attributes.value;
        }).otherwise(function (error) {
            // this is where all the "first run" functionality should go
            var dbhash = uuid.v4();
            return when(models.Settings.add({key: 'dbHash', value: dbhash})).then(function (returned) {
                self.dbHash = dbhash;
                return dbhash;
            });
        });
    }, errors.logAndThrowError);
};

// Maintain the internal cache of the settings object
Ghost.prototype.updateSettingsCache = function (settings) {
    var self = this;

    settings = settings || {};

    if (!_.isEmpty(settings)) {
        self.settingsCache = settings;
    } else {
        // TODO: this should use api.browse
        return models.Settings.findAll().then(function (result) {
            var settings = {};
            _.map(result.models, function (member) {
                if (!settings.hasOwnProperty(member.attributes.key)) {
                    settings[member.attributes.key] = member.attributes.value;
                }
            });

            self.settingsCache = settings;
        }, errors.logAndThrowError);
    }
};

// ## Template utils

// Compile a template for a handlebars helper
Ghost.prototype.compileTemplate = function (templatePath) {
    return nodefn.call(fs.readFile, templatePath).then(function (templateContents) {
        return hbs.handlebars.compile(templateContents.toString());
    }, errors.logAndThrowError);
};

// Load a template for a handlebars helper
Ghost.prototype.loadTemplate = function (name) {
    var self = this,
        templateFileName = name + '.hbs',
        // Check for theme specific version first
        templatePath = path.join(this.paths().activeTheme, "partials", templateFileName),
        deferred = when.defer();

    // Can't use nodefn here because exists just returns one parameter, true or false

    fs.exists(templatePath, function (exists) {
        if (!exists) {
            // Fall back to helpers templates location
            templatePath = path.join(self.paths().helperTemplates, templateFileName);
        }

        self.compileTemplate(templatePath).then(deferred.resolve, deferred.reject);
    });

    return deferred.promise;
};

// Register a handlebars helper for themes
Ghost.prototype.registerThemeHelper = function (name, fn) {
    hbs.registerHelper(name, fn);
};

// Register a new filter callback function
Ghost.prototype.registerFilter = function (name, priority, fn) {
    // Curry the priority optional parameter to a default of 5
    if (_.isFunction(priority)) {
        fn = priority;
        priority = defaults.filterPriority;
    }

    this.filterCallbacks[name] = this.filterCallbacks[name] || {};
    this.filterCallbacks[name][priority] = this.filterCallbacks[name][priority] || [];

    this.filterCallbacks[name][priority].push(fn);
};

// Unregister a filter callback function
Ghost.prototype.unregisterFilter = function (name, priority, fn) {
    // Curry the priority optional parameter to a default of 5
    if (_.isFunction(priority)) {
        fn = priority;
        priority = defaults.filterPriority;
    }

    // Check if it even exists
    if (this.filterCallbacks[name] && this.filterCallbacks[name][priority]) {
        // Remove the function from the list of filter funcs
        this.filterCallbacks[name][priority] = _.without(this.filterCallbacks[name][priority], fn);
    }
};

// Execute filter functions in priority order
Ghost.prototype.doFilter = function (name, args, callback) {
    var callbacks = this.filterCallbacks[name];

    // Bug out early if no callbacks by that name
    if (!callbacks) {
        return callback(args);
    }

    _.times(defaults.maxPriority + 1, function (priority) {
        // Bug out if no handlers on this priority
        if (!_.isArray(callbacks[priority])) {
            return;
        }

        // Call each handler for this priority level
        _.each(callbacks[priority], function (filterHandler) {
            try {
                args = filterHandler(args);
            } catch (e) {
                // If a filter causes an error, we log it so that it can be debugged, but do not throw the error
                errors.logError(e);
            }
        });
    });

    callback(args);
};

// Initialise plugins.  Will load from config.activePlugins by default
Ghost.prototype.initPlugins = function (pluginsToLoad) {
    pluginsToLoad = pluginsToLoad || config.activePlugins;

    var self = this;

    return plugins.init(this, pluginsToLoad).then(function (loadedPlugins) {
        // Extend the loadedPlugins onto the available plugins
        _.extend(self.availablePlugins, loadedPlugins);
    }, errors.logAndThrowError);
};

// Initialise Theme or admin
Ghost.prototype.initTheme = function (app) {
    var self = this;
    return function initTheme(req, res, next) {
        app.set('view engine', 'hbs');
        // return the correct mime type for woff files
        express['static'].mime.define({'application/font-woff': ['woff']});

        if (!res.isAdmin) {
            app.engine('hbs', hbs.express3(
                {partialsDir: path.join(self.paths().activeTheme, 'partials')}
            ));
            app.set('views', self.paths().activeTheme);
        } else {
            app.engine('hbs', hbs.express3({partialsDir: self.paths().adminViews + 'partials'}));
            app.set('views', self.paths().adminViews);
            app.use('/public', express['static'](path.join(__dirname, '/client/assets')));
            app.use('/public', express['static'](path.join(__dirname, '/client')));
        }
        app.use(express['static'](self.paths().activeTheme));
        app.use('/shared', express['static'](path.join(__dirname, '/shared')));
        app.use('/content/images', express['static'](path.join(__dirname, '/../content/images')));
        next();
    };
};

// TODO: Expose the defaults for other people to see/manipulate as a static value?
// Ghost.defaults = defaults;

module.exports = Ghost;
