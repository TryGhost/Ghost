// It's important to keep the requires absolutely minimal here,
// As this cache is used in SO many other areas, we may open ourselves to
// circular dependency bugs.
var debug = require('debug')('ghost:settings:cache'),
    events = require('../events'),
    /**
     * ## Cache
     * Holds cached settings
     * @type {{}}
     */
    settingsCache = {};

/**
 *
 * IMPORTANT:
 * We store settings with a type and a key in the database.
 *
 * {
 *   type: core
 *   key: dbHash
 *   value: ...
 * }
 *
 * But the settings cache does not allow requesting a value by type, only by key.
 * e.g. settingsCache.get('dbHash')
 */
module.exports = {
    get: function get(key, options) {
        if (!settingsCache[key]) {
            return;
        }

        // Don't try to resolve to the value of the setting
        if (options && options.resolve === false) {
            return settingsCache[key];
        }

        // Default behaviour is to try to resolve the value and return that
        try {
            return JSON.parse(settingsCache[key].value);
        } catch (err) {
            return settingsCache[key].value;
        }
    },
    set: function set(key, value) {
        settingsCache[key] = value;
    },
    getAll: function getAll() {
        return settingsCache;
    },
    init: function init() {
        var self = this,
            updateSettingFromModel = function updateSettingFromModel(settingModel) {
                debug('Auto updating', settingModel.get('key'));
                self.set(settingModel.get('key'), settingModel.toJSON());
            };
        // First, reset the cache
        settingsCache = {};

        // Bind to events to automatically keep up-to-date
        events.on('settings.edited', updateSettingFromModel);
        events.on('settings.added', updateSettingFromModel);
        events.on('settings.deleted', updateSettingFromModel);

        return settingsCache;
    }
};
