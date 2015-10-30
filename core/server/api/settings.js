// # Settings API
// RESTful API for the Setting resource
var _            = require('lodash'),
    dataProvider = require('../models'),
    Promise      = require('bluebird'),
    pipeline     = require('../utils/pipeline'),
    config       = require('../config'),
    errors       = require('../errors'),
    utils        = require('./utils'),

    docName      = 'settings',
    settings,

    hasPopulatedDefaults = false,

    /**
     * ## Cache
     * Holds cached settings
     * @private
     * @type {{}}
     */
    settingsCache = {};

/**
* ### Updates Config Theme Settings
* Maintains the cache of theme specific variables that are reliant on settings.
* @private
*/

function updateConfigTheme() {
    config.set({
        theme: {
            title: settingsCache.title && settingsCache.title.value || '',
            description: settingsCache.description && settingsCache.description.value || '',
            logo: settingsCache.logo && settingsCache.logo.value || '',
            cover: settingsCache.cover && settingsCache.cover.value || '',
            navigation: settingsCache.navigation && settingsCache.navigation.value && JSON.parse(settingsCache.navigation.value) || []
        }
    });
}

/**
 * ### Filter Paths
 * Normalizes paths read by require-tree so that the apps and themes modules can use them. Creates an empty
 * array (res), and populates it with useful info about the read packages like name, whether they're active
 * (comparison with the second argument), and if they have a package.json, that, otherwise false
 * @private
 * @param   {object}            paths       as returned by require-tree()
 * @param   {array/string}      active      as read from the settings object
 * @returns {Array}                         of objects with useful info about apps / themes
 */

function filterPaths(paths, active) {
    var result = [];

    // turn active into an array (so themes and apps can be checked the same)
    if (!_.isArray(active)) {
        active = [active];
    }

    _.each(paths, function (files, name) {
        var isIgnored,
            item;

        isIgnored = name.toLowerCase() === 'readme.md';

        if (isIgnored) {
            return;
        }

        item = {
            name: name,
            package: files['package.json'],
            active: active.indexOf(name) >= 0
        };

        result.push(item);
    });

    return result;
}

/**
 * ### Read Settings Result
 * @private
 * @param {Array} models
 * @returns {Settings}
 */

function readSettingsResult(models) {
    var availableThemes = config.paths.availableThemes,
        availableApps = config.paths.availableApps,
        themes,
        apps,
        settings = {};

    _.each(models, function (model) {
        var attrs = model.attributes;

        if (attrs.key) {
            settings[attrs.key] = attrs;
        }
    });

    if (settings.activeTheme && availableThemes) {
        themes = filterPaths(availableThemes, settings.activeTheme.value);

        settings.availableThemes = {
            key: 'availableThemes',
            value: themes,
            type: 'theme'
        };
    }

    if (settings.activeApps && availableApps) {
        apps = filterPaths(availableApps, JSON.parse(settings.activeApps.value));

        settings.availableApps = {
            key: 'availableApps',
            value: apps,
            type: 'app'
        };
    }

    return settings;
}

/**
 * ### Update Settings Cache
 * Maintain the internal cache of the settings object
 * @public
 * @param {Object} settings
 * @returns {Settings}
 */

function updateSettingsCache(settings) {
    if (!settings) {
        settings = {};
    }

    if (!_.isEmpty(settings)) {
        _.each(settings, function (setting, key) {
            settingsCache[key] = setting;
        });

        updateConfigTheme();

        return Promise.resolve(settingsCache);
    }

    return dataProvider.Settings.findAll().then(function (result) {
        settingsCache = readSettingsResult(result.models);

        updateConfigTheme();

        return settingsCache;
    });
}

// ## Helpers

/**
 * ### Settings Filter
 * Include only settings of type(s) specified in `types`
 * @private
 * @param {Object} settings
 * @param {String|Array} types
 * @returns {*}
 */

function settingsFilter(settings, types) {
    if (!types || types.length === 0) {
        return settings;
    }

    if (!_.isArray(types)) {
        types = types.split(',');
    }

    return _.object(_.filter(_.pairs(settings), function (setting) {
        return _.some(types, function (type) {
            return setting[1].type === type;
        });
    }));
}

/**
 * ### Format Settings Result
 * @private
 * @param {Object} settings
 * @param {String} type
 * @returns {{settings: *}}
 */

function formatResult(settings, type) {
    var filteredSettings,
        result;

    filteredSettings = _.values(settingsFilter(settings, type));

    result = {
        settings: filteredSettings,
        meta: {}
    };

    if (type) {
        result.meta.filters = {type: type};
    }

    return result;
}

/**
 * ### Populate Default Setting
 * @private
 * @param {String} key
 * @returns Promise(Setting)
 */

function populateDefaultSetting(key) {
    // Call populateDefault and update the settings cache
    return dataProvider.Settings.populateDefault(key)
        .then(function (setting) {
            // Process the default result and add to settings cache
            var result = readSettingsResult([setting]);

            // Add to the settings cache
            return updateSettingsCache(result);
        });
}

/**
 * ### Check if request is internal
 * @private
 * @param {Object} options
 * @returns {Boolean}
 */

function isInternalRequest(options) {
    return options && options.context && options.context.internal;
}

/**
 * ## Settings API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
settings = {

    /**
     * ### Browse
     * @param {Object} options
     * @returns {*}
     */
    browse: function browse(options) {
        var tasks;

        /**
         * ### Populate Default Settings
         * @param {Object} options
         * @returns {Object} options
         */

        function populateDefaults(options) {
            if (hasPopulatedDefaults) {
                return options;
            }

            return dataProvider.Settings.populateDefaults().then(function () {
                hasPopulatedDefaults = true;

                return options;
            });
        }

        /**
         * ### Model Query
         * @param {Object} options
         * @returns {Settings} settings
         */

        function modelQuery(options) {
            return formatResult(settingsCache, options.type);
        }

        /**
         * ### Filter private settings, if needed
         * @param {Object} result
         * @returns {Object} result
         */

        function filterSettings(result) {
            if (!options.context) {
                result.settings = _.filter(result.settings, function (setting) {
                    return setting.type === 'blog';
                });

                return result;
            }

            return utils.handlePermissions(docName, 'browse')(options).then(function () {
                if (!isInternalRequest(options)) {
                    result.settings = _.filter(result.settings, function (setting) {
                        return setting.type !== 'core';
                    });
                }

                return result;
            });
        }

        tasks = [
            populateDefaults,
            modelQuery,
            filterSettings
        ];

        return pipeline(tasks, options || {});
    },

    /**
     * ### Read
     * @param {Object} options
     * @returns {*}
     */
    read: function read(options) {
        var tasks;

        if (_.isString(options)) {
            options = {key: options};
        }

        /**
         * ### Populate Default Setting Value
         * @param {Object} options
         * @returns {Object} options
         */

        function populateDefaults(options) {
            var hasValue = !!settingsCache[options.key];

            if (hasValue) {
                return options;
            }

            return populateDefaultSetting(options.key);
        }

        /**
         * ### Model Query
         * @param {Object} options
         * @returns {Setting} setting
         */

        function modelQuery(options) {
            var setting = settingsCache[options.key],
                result = {},
                err;

            result[options.key] = setting;

            // core settings can be accessed only by internal requests
            if (setting.type === 'core' && !isInternalRequest(options)) {
                err = new errors.NoPermissionError('Attempted to access core setting from external request.');

                return Promise.reject(err);
            }

            // blog settings can be read by anyone, thus no need to validate permissions
            if (setting.type === 'blog') {
                return formatResult(result);
            }

            options.id = setting.key;

            return utils.handlePermissions(docName, 'read')(options).then(function () {
                return formatResult(result);
            });
        }

        tasks = [
            populateDefaults,
            modelQuery
        ];

        return pipeline(tasks, options || {});
    },

    /**
     * ### Edit
     * Update properties of a post
     * @param {{settings: }} object Setting or a single string name
     * @param {{id (required), include,...}} options (optional) or a single string value
     * @return {Promise(Setting)} Edited Setting
     */
    edit: function edit(object, options) {
        var self = this,
            tasks,
            type;

        if (!options) {
            options = {};
        }

        // Allow shorthand syntax where a single key and value are passed to edit instead of object and options
        if (_.isString(object)) {
            object = {
                settings: [{
                    key: object,
                    value: options
                }]
            };
        }

        // clean data
        _.each(object.settings, function (setting) {
            if (!_.isString(setting.value)) {
                setting.value = JSON.stringify(setting.value);
            }
        });

        type = _.find(object.settings, function (setting) {
            return setting.key === 'type';
        });

        if (_.isObject(type)) {
            type = type.value;
        }

        object.settings = _.reject(object.settings, function (setting) {
            return setting.key === 'type' || setting.key === 'availableThemes' || setting.key === 'availableApps';
        });

        /**
         * ### Populate Default Setting Values
         * @param {Object} result
         * @returns {Object} result
         */

        function populateDefaults(result) {
            var defaults = _.map(result.settings, function (setting) {
                var hasValue = !!settingsCache[setting.key];

                if (hasValue) {
                    return Promise.resolve();
                }

                return populateDefaultSetting(setting.key);
            });

            return Promise.all(defaults).return(result);
        }

        /**
         * ### Handle Permissions
         * @param {Object} result
         * @returns {Object} result
         */

        function handlePermissions(result) {
            var checks = _.map(result.settings, function (setting) {
                var settingOptions,
                    err;

                setting = settingsCache[setting.key] || setting;
                settingOptions = _.extend({id: setting.key}, options);

                if (setting.type === 'core' && !isInternalRequest(options)) {
                    err = new errors.NoPermissionError('Attempted to access core setting from external request.');

                    return Promise.reject(err);
                }

                return utils.handlePermissions(docName, 'edit')(settingOptions);
            });

            return Promise.all(checks).return(result);
        }

        /**
         * ### Validate Settings
         * @param {Object} result
         * @returns {Object} result
         */

        function validateSettings(result) {
            return utils.checkObject(result, docName);
        }

        /**
         * ### Update Settings
         * @param {Object} result
         * @returns {Object} result
         */

        function updateSettings(result) {
            options.user = self.user;

            return dataProvider.Settings.edit(result.settings, options);
        }

        /**
         * ### Cache Updated Settings
         * @param {Object} result
         * @returns {Object} result
         */

        function cacheSettings(result) {
            var updatedResult = readSettingsResult(result);

            return updateSettingsCache(updatedResult).then(function () {
                return formatResult(updatedResult, type);
            });
        }

        tasks = [
            populateDefaults,
            handlePermissions,
            validateSettings,
            updateSettings,
            cacheSettings
        ];

        return pipeline(tasks, object);
    }
};

module.exports = settings;
module.exports.updateSettingsCache = updateSettingsCache;
