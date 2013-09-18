// # Ghost Module
// Defines core methods required to build the application

// Module dependencies
var config = require('../config'),
    when = require('when'),
    express = require('express'),
    errors = require('./server/errorHandling'),
    fs = require('fs'),
    path = require('path'),
    hbs = require('express-hbs'),
    nodefn = require('when/node/function'),
    _ = require('underscore'),
    Polyglot = require('node-polyglot'),
    Mailer = require('./server/mail'),
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
    defaults;

// ## Default values
/**
 * A hash of default values to use instead of 'magic' numbers/strings.
 * @type {Object}
 */
defaults = {
    filterPriority: 5,
    maxPriority: 9
};

// ## Module Methods
/**
 * @method Ghost
 * @returns {*}
 * @constructor
 */
Ghost = function () {
    var polyglot;

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

        polyglot = new Polyglot();

        _.extend(instance, {
            config: function () { return config[process.env.NODE_ENV]; },

            // there's no management here to be sure this has loaded
            settings: function (key) {
                if (key) {
                    return instance.settingsCache[key].value;
                }
                return instance.settingsCache;
            },
            dataProvider: models,
            blogGlobals:  function () {
                /* this is a bit of a hack until we have a better way to combine settings and config
                 * this data is what becomes globally available to themes */
                return {
                    url: instance.config().url,
                    title: instance.settings('title'),
                    description: instance.settings('description'),
                    logo: instance.settings('logo'),
                    cover: instance.settings('cover')
                };
            },
            polyglot: function () { return polyglot; },
            mail: new Mailer(),
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
                    'activeTheme':      path.join(themePath, !instance.settingsCache ? "" : instance.settingsCache.activeTheme.value),
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

    function doFirstRun() {
        var firstRunMessage = [
            "Welcome to Ghost.",
            "You're running under the <strong>",
            process.env.NODE_ENV,
            "</strong>environment.",

            "Your URL is set to",
            "<strong>" + self.config().url + "</strong>.",
            "See <a href=\"http://docs.ghost.org/\">http://docs.ghost.org</a> for instructions."
        ];

        self.notifications.push({
            type: 'info',
            message: firstRunMessage.join(' '),
            status: 'persistent',
            id: 'ghost-first-run'
        });
        return when.resolve();
    }

    function initDbHashAndFirstRun() {
        return when(models.Settings.read('dbHash')).then(function (dbhash) {
            // we already ran this, chill
            self.dbHash = dbhash.attributes.value;
            return dbhash.attributes.value;
        }).otherwise(function (error) {
            // this is where all the "first run" functionality should go
            var dbhash = uuid.v4();
            return when(models.Settings.add({key: 'dbHash', value: dbhash, type: 'core'})).then(function () {
                self.dbHash = dbhash;
                return dbhash;
            }).then(doFirstRun);
        });
    }

    // ### Initialisation
    // make sure things are done in order
    return when.join(
        // Initialise the models
        instance.dataProvider.init(),
        // Calculate paths
        instance.getPaths(),
        // Initialise mail after first run
        instance.mail.init(self)
    ).then(function () {
        // Populate any missing default settings
        return models.Settings.populateDefaults();
    }).then(function () {
        // Initialize the settings cache
        return self.updateSettingsCache();
    }).then(function () {
        return when.join(
            // Check for or initialise a dbHash.
            initDbHashAndFirstRun(),
             // Initialize plugins
            self.initPlugins(),
            // Initialize the permissions actions and objects
            permissions.init()
        );
    }).otherwise(errors.logAndThrowError);
};

// Maintain the internal cache of the settings object
Ghost.prototype.updateSettingsCache = function (settings) {
    var self = this;

    settings = settings || {};

    if (!_.isEmpty(settings)) {
        _.map(settings, function (setting, key) {
            self.settingsCache[key].value = setting.value;
        });
    } else {
        // TODO: this should use api.browse
        return when(models.Settings.findAll()).then(function (result) {
            return when(self.readSettingsResult(result)).then(function (s) {
                self.settingsCache = s;
            });
        });
    }
};

Ghost.prototype.readSettingsResult = function (result) {
    var settings = {};
    return when(_.map(result.models, function (member) {
        if (!settings.hasOwnProperty(member.attributes.key)) {
            var val = {};
            val.value = member.attributes.value;
            val.type = member.attributes.type;
            settings[member.attributes.key] = val;
        }
    })).then(function () {
        return when(instance.paths().availableThemes).then(function (themes) {
            var themeKeys = Object.keys(themes),
                res = [],
                i,
                item;
            for (i = 0; i < themeKeys.length; i += 1) {
                //do not include hidden files
                if (themeKeys[i].indexOf('.') !== 0) {
                    item = {};
                    item.name = themeKeys[i];
                    //data about files currently not used
                    //item.details = themes[themeKeys[i]];
                    if (themeKeys[i] === settings.activeTheme.value) {
                        item.active = true;
                    }
                    res.push(item);
                }
            }
            settings.availableThemes = {};
            settings.availableThemes.value = res;
            settings.availableThemes.type = 'theme';
            return settings;
        });
    });
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
    pluginsToLoad = pluginsToLoad || models.Settings.activePlugins;
    var self = this;

    return plugins.init(this, pluginsToLoad).then(function (loadedPlugins) {
        // Extend the loadedPlugins onto the available plugins
        _.extend(self.availablePlugins, loadedPlugins);
    }, errors.logAndThrowError);
};

module.exports = Ghost;