// It's important to keep the requires absolutely minimal here,
// As this cache is used in SO many other areas, we may open ourselves to
// circular dependency bugs.
const debug = require('ghost-ignition').debug('settings:cache');
const _ = require('lodash');
const common = require('../../lib/common');
const publicSettings = require('./public');

// Local function, only ever used for initialising
// We deliberately call "set" on each model so that set is a consistent interface
const updateSettingFromModel = function updateSettingFromModel(settingModel) {
    debug('Auto updating', settingModel.get('key'));
    module.exports.set(settingModel.get('key'), settingModel.toJSON());
};

/**
 * ## Cache
 * Holds cached settings
 * Keyed by setting.key
 * Contains the JSON version of the model
 * @type {{}} - object of objects
 */
let settingsCache = {};

const doGet = (key, options) => {
    if (!settingsCache[key]) {
        return;
    }

    // Don't try to resolve to the value of the setting
    if (options && options.resolve === false) {
        return settingsCache[key] || null;
    }

    // Default behaviour is to try to resolve the value and return that
    try {
        // CASE: if a string contains a number e.g. "1", JSON.parse will auto convert into integer
        if (!isNaN(Number(settingsCache[key].value))) {
            return settingsCache[key].value || null;
        }

        return JSON.parse(settingsCache[key].value) || null;
    } catch (err) {
        return settingsCache[key].value || null;
    }
};

/**
 *
 * IMPORTANT:
 * We store settings with a type and a key in the database.
 *
 * {
 *   type: core
 *   key: db_hash
 *   value: ...
 * }
 *
 * But the settings cache does not allow requesting a value by type, only by key.
 * e.g. settingsCache.get('db_hash')
 */
module.exports = {
    /**
     * Get a key from the settingsCache
     * Will resolve to the value, including parsing JSON, unless {resolve: false} is passed in as an option
     * In which case the full JSON version of the model will be resolved
     *
     * @param {string} key
     * @param {object} options
     * @return {*}
     */
    get(key, options) {
        return doGet(key, options);
    },
    /**
     * Set a key on the cache
     * The only way to get an object into the cache
     * Uses clone to prevent modifications from being reflected
     * @param {string} key
     * @param {object} value json version of settings model
     */
    set(key, value) {
        settingsCache[key] = _.cloneDeep(value);
    },
    /**
     * Get the entire cache object
     * Uses clone to prevent modifications from being reflected
     * @return {{}} cache
     */
    getAll() {
        return _.cloneDeep(settingsCache);
    },

    /**
     * Get all the publically accessible cache entries with their correct names
     * Uses clone to prevent modifications from being reflected
     * @return {{}} cache
     */
    getPublic() {
        let settings = {};

        _.each(publicSettings, (newKey, key) => {
            settings[newKey] = doGet(key) || null;
        });

        return settings;
    },
    /**
     * Initialise the cache
     *
     * Optionally takes a collection of settings & can populate the cache with these.
     *
     * @param {Bookshelf.Collection<Settings>} [settingsCollection]
     * @return {{}}
     */
    init(settingsCollection) {
        // First, reset the cache
        settingsCache = {};

        // // if we have been passed a collection of settings, use this to populate the cache
        if (settingsCollection && settingsCollection.models) {
            _.each(settingsCollection.models, updateSettingFromModel);
        }

        // Bind to events to automatically keep up-to-date
        common.events.on('settings.edited', updateSettingFromModel);
        common.events.on('settings.added', updateSettingFromModel);
        common.events.on('settings.deleted', updateSettingFromModel);

        return settingsCache;
    },

    shutdown() {
        common.events.removeListener('settings.edited', updateSettingFromModel);
        common.events.removeListener('settings.added', updateSettingFromModel);
        common.events.removeListener('settings.deleted', updateSettingFromModel);
    },

    reset() {
        settingsCache = {};
    }
};
