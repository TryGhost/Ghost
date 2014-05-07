var _            = require('lodash'),
    dataProvider = require('../models'),
    when         = require('when'),
    config       = require('../config'),
    settings,
    settingsFilter,
    updateSettingsCache,
    readSettingsResult,
    filterPaths,
    settingsResult,
    // Holds cached settings
    settingsCache = {};

// ### Helpers

// Filters an object based on a given filter object
settingsFilter = function (settings, filter) {
    return _.object(_.filter(_.pairs(settings), function (setting) {
        if (filter) {
            return _.some(filter.split(','), function (f) {
                return setting[1].type === f;
            });
        }
        return true;
    }));
};

// Maintain the internal cache of the settings object
updateSettingsCache = function (settings) {
    settings = settings || {};

    if (!_.isEmpty(settings)) {
        _.map(settings, function (setting, key) {
            settingsCache[key] = setting;
        });

        return when(settingsCache);
    }

    return dataProvider.Settings.findAll()
        .then(function (result) {
            settingsCache = readSettingsResult(result.models);

            return settingsCache;
        });
};

readSettingsResult = function (settingsModels) {
    var settings = _.reduce(settingsModels, function (memo, member) {
            if (!memo.hasOwnProperty(member.attributes.key)) {
                memo[member.attributes.key] = member.attributes;
            }

            return memo;
        }, {}),
        themes = config().paths.availableThemes,
        apps = config().paths.availableApps,
        res;

    if (settings.activeTheme) {
        res = filterPaths(themes, settings.activeTheme.value);

        settings.availableThemes = {
            key: 'availableThemes',
            value: res,
            type: 'theme'
        };
    }

    if (settings.activeApps) {
        res = filterPaths(apps, JSON.parse(settings.activeApps.value));

        settings.availableApps = {
            key: 'availableApps',
            value: res,
            type: 'app'
        };
    }

    return settings;
};


// Normalizes paths read by require-tree so that the apps and themes modules can use them.
// Creates an empty array (res), and populates it with useful info about the read packages
// like name, whether they're active (comparison with the second argument), and if they
// have a package.json, that, otherwise false
// @param  {object}           paths       as returned by require-tree()
// @param  {array/string}     active      as read from the settings object
// @return {array}                        of objects with useful info about apps / themes

filterPaths = function (paths, active) {
    var pathKeys = Object.keys(paths),
        res = [],
        item;

    // turn active into an array (so themes and apps can be checked the same)
    if (!Array.isArray(active)) {
        active = [active];
    }

    _.each(pathKeys, function (key) {
        //do not include hidden files or _messages
        if (key.indexOf('.') !== 0 &&
                key !== '_messages' &&
                key !== 'README.md'
                ) {
            item = {
                name: key
            };
            if (paths[key].hasOwnProperty('package.json')) {
                item.package = paths[key]['package.json'];
            } else {
                item.package = false;
            }

            if (_.indexOf(active, key) !== -1) {
                item.active = true;
            }
            res.push(item);
        }
    });
    return res;
};

settingsResult = function (settings, type) {
    var filteredSettings = _.values(settingsFilter(settings, type)),
        result = {
            settings: filteredSettings
        };

    if (type) {
        result.meta = {
            filters: {
                type: type
            }
        };
    }

    return result;
};

settings = {
    // #### Browse

    // **takes:** options object
    browse: function browse(options) {
        //TODO: omit where type==core
        // **returns:** a promise for a settings json object
        return when(settingsResult(settingsCache, options.type));
    },

    // #### Read

    // **takes:** either a json object containing a key, or a single key string
    read: function read(options) {
        if (_.isString(options)) {
            options = { key: options };
        }

        var setting = settingsCache[options.key],
            result = {};

        if (!setting) {
            return when.reject({type: 'NotFound', message: 'Unable to find setting: ' + options.key});
        }

        result[options.key] = setting;

        return when(settingsResult(result));
    },

    // #### Edit

     // **takes:** either a json object representing a collection of settings, or a key and value pair
    edit: function edit(key, value) {
        var self = this,
            type;

        // Allow shorthand syntax
        if (_.isString(key)) {
            key = { settings: [{ key: key, value: value }]};
        }

        //clean data
        type = _.find(key.settings, function (setting) { return setting.key === 'type'; });
        if (_.isObject(type)) {
            type = type.value;
        }

        key = _.reject(key.settings, function (setting) {
            return setting.key === 'type' || setting.key === 'availableThemes' || setting.key === 'availableApps';
        });

        return dataProvider.Settings.edit(key, {user: self.user}).then(function (result) {
            var readResult = readSettingsResult(result);

            return updateSettingsCache(readResult).then(function () {
                return config.theme.update(settings, config().url);
            }).then(function () {
                return settingsResult(readResult, type);
            });
        }).otherwise(function (error) {
            // In case something goes wrong it is most likely because of an invalid key
            // or because of a badly formatted request.
            return when.reject({type: 'BadRequest', message: error.message});
        });
    }
};

module.exports = settings;
module.exports.updateSettingsCache = updateSettingsCache;