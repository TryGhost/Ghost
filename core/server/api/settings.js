var _            = require('underscore'),
    dataProvider = require('../models'),
    when         = require('when'),
    errors       = require('../errorHandling'),
    config       = require('../config'),
    settings,
    settingsObject,
    settingsCollection,
    settingsFilter,
    updateSettingsCache,
    readSettingsResult,
    // Holds cached settings
    settingsCache = {};

// ### Helpers
// Turn a settings collection into a single object/hashmap
settingsObject = function (settings) {
    if (_.isObject(settings)) {
        return _.reduce(settings, function (res, item, key) {
            if (_.isArray(item)) {
                res[key] = item;
            } else {
                res[key] = item.value;
            }
            return res;
        }, {});
    }
    return (settings.toJSON ? settings.toJSON() : settings).reduce(function (res, item) {
        if (item.toJSON) { item = item.toJSON(); }
        if (item.key) { res[item.key] = item.value; }
        return res;
    }, {});
};
// Turn an object into a collection
settingsCollection = function (settings) {
    return _.map(settings, function (value, key) {
        return { key: key, value: value };
    });
};

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
            settingsCache[key].value = setting.value;
        });
    } else {
        return when(dataProvider.Settings.findAll()).then(function (result) {
            return when(readSettingsResult(result)).then(function (s) {
                settingsCache = s;
            });
        });
    }
};

readSettingsResult = function (result) {
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

settings = {
    // #### Browse

    // **takes:** options object
    browse: function browse(options) {
        // **returns:** a promise for a settings json object
        if (settingsCache) {
            return when(settingsCache).then(function (settings) {
                //TODO: omit where type==core
                return settingsObject(settingsFilter(settings, options.type));
            }, errors.logAndThrowError);
        }
    },

    // #### Read

    // **takes:** either a json object containing a key, or a single key string
    read: function read(options) {
        if (_.isString(options)) {
            options = { key: options };
        }

        if (settingsCache) {
            return when(settingsCache[options.key]).then(function (setting) {
                if (!setting) {
                    return when.reject({errorCode: 404, message: 'Unable to find setting: ' + options.key});
                }
                var res = {};
                res.key = options.key;
                res.value = setting.value;
                return res;
            }, errors.logAndThrowError);
        }
    },

    // #### Edit

     // **takes:** either a json object representing a collection of settings, or a key and value pair
    edit: function edit(key, value) {
        // Check for passing a collection of settings first
        if (_.isObject(key)) {
            //clean data
            var type = key.type;
            delete key.type;
            delete key.availableThemes;

            key = settingsCollection(key);
            return dataProvider.Settings.edit(key).then(function (result) {
                result.models = result;
                return when(readSettingsResult(result)).then(function (settings) {
                    updateSettingsCache(settings);
                }).then(function () {
                    return config.theme.update(settings, config().url).then(function () {
                        return settingsObject(settingsFilter(settingsCache, type));
                    });
                });
            }).otherwise(function (error) {
                return dataProvider.Settings.read(key.key).then(function (result) {
                    if (!result) {
                        return when.reject({errorCode: 404, message: 'Unable to find setting: ' + key});
                    }
                    return when.reject({message: error.message});
                });
            });
        }
        return dataProvider.Settings.read(key).then(function (setting) {
            if (!setting) {
                return when.reject({errorCode: 404, message: 'Unable to find setting: ' + key});
            }
            if (!_.isString(value)) {
                value = JSON.stringify(value);
            }
            setting.set('value', value);
            return dataProvider.Settings.edit(setting).then(function (result) {
                settingsCache[_.first(result).attributes.key].value = _.first(result).attributes.value;
            }).then(function () {
                return config.theme.update(settings, config().url).then(function () {
                    return settingsObject(settingsCache);
                });
            }).otherwise(errors.logAndThrowError);
        });
    }
};

module.exports = settings;
module.exports.updateSettingsCache = updateSettingsCache;