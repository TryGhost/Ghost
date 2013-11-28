// # Ghost Module
// Defines core methods required to build the application

// Module dependencies
var config        = require('./server/config'),
    when          = require('when'),
    express       = require('express'),
    errors        = require('./server/errorHandling'),
    _             = require('underscore'),
    url           = require('url'),
    models        = require('./server/models'),
    permissions   = require('./server/permissions'),
    uuid          = require('node-uuid'),

// Variables
    Ghost,
    instance;

// ## Module Methods
/**
 * @method Ghost
 * @returns {*}
 * @constructor
 */
Ghost = function () {

    if (!instance) {
        instance = this;

        // Holds the persistent notifications
        instance.notifications = [];

        // Holds the dbhash (mainly used for cookie secret)
        instance.dbHash = undefined;

        _.extend(instance, {
            // there's no management here to be sure this has loaded
            settings: function (key) {
                if (key) {
                    return instance.settingsCache[key].value;
                }
                return instance.settingsCache;
            },
            dataProvider: models,
            blogGlobals:  function () {
                var localPath = url.parse(config().url).path;

                // Remove trailing slash
                if (localPath !== '/') {
                    localPath = localPath.replace(/\/$/, '');
                }

                /* this is a bit of a hack until we have a better way to combine settings and config
                 * this data is what becomes globally available to themes */
                return {
                    url: config().url.replace(/\/$/, ''),
                    path: localPath,
                    title: instance.settings('title'),
                    description: instance.settings('description'),
                    logo: instance.settings('logo'),
                    cover: instance.settings('cover')
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
            'Welcome to Ghost.',
            'You\'re running under the <strong>',
            process.env.NODE_ENV,
            '</strong>environment.',

            'Your URL is set to',
            '<strong>' + config().url + '</strong>.',
            'See <a href="http://docs.ghost.org/">http://docs.ghost.org</a> for instructions.'
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
            /*jslint unparam:true*/
            // this is where all the "first run" functionality should go
            var dbhash = uuid.v4();
            return when(models.Settings.add({key: 'dbHash', value: dbhash, type: 'core'})).then(function () {
                self.dbHash = dbhash;
                return dbhash;
            }).then(doFirstRun);
        });
    }

    // ### Initialisation
    return when.join(
        // Initialise the models
        self.dataProvider.init(),
        // Calculate paths
        config.paths.updatePaths()
    ).then(function () {
        // Populate any missing default settings
        return models.Settings.populateDefaults();
    }).then(function () {
        // Initialize the settings cache
        return self.updateSettingsCache();
    }).then(function () {
        // Update path to activeTheme
        config.paths.setActiveTheme(self);
        return when.join(
            // Check for or initialise a dbHash.
            initDbHashAndFirstRun(),
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
        return when(config.paths().availableThemes).then(function (themes) {
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

module.exports = Ghost;
