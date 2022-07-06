// It's important to keep the requires absolutely minimal here,
// As this cache is used in SO many other areas, we may open ourselves to
// circular dependency bugs.
const debug = require('@tryghost/debug')('settings:cache');
const _ = require('lodash');

const publicSettings = require('./public');

// Local function, only ever used for initializing
// We deliberately call "set" on each model so that set is a consistent interface
const updateSettingFromModel = function updateSettingFromModel(settingModel) {
    debug('Auto updating', settingModel.get('key'));
    module.exports.set(settingModel.get('key'), settingModel.toJSON());
};

const updateCalculatedField = function updateCalculatedField(field) {
    return () => {
        debug('Auto updating', field.key);
        module.exports.set(field.key, field.getSetting());
    };
};

/**
 * ## Cache
 * Holds cached settings
 * Keyed by setting.key
 * Contains the JSON version of the model
 * @type {{}} - object of objects
 */
let settingsCache = {};
let _calculatedFields = [];

const doGet = (key, options) => {
    if (!settingsCache[key]) {
        return;
    }

    // Don't try to resolve to the value of the setting
    if (options && options.resolve === false) {
        return settingsCache[key];
    }

    // Default behaviour is to try to resolve the value and return that
    try {
        // CASE: handle literal false
        if (settingsCache[key].value === false || settingsCache[key].value === 'false') {
            return false;
        }

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
     * @return {object} cache
     */
    getAll() {
        return _.cloneDeep(settingsCache);
    },

    /**
     * Get all the publically accessible cache entries with their correct names
     * Uses clone to prevent modifications from being reflected
     * @return {object} cache
     */
    getPublic() {
        let settings = {};

        _.each(publicSettings, (key, newKey) => {
            settings[newKey] = doGet(key) ?? null;
        });

        return settings;
    },
    /**
     * Initialise the cache
     *
     * Optionally takes a collection of settings & can populate the cache with these.
     *
     * @param {EventEmitter} events
     * @param {Bookshelf.Collection<Settings>} settingsCollection
     * @param {Array} calculatedFields
     * @return {object}
     */
    init(events, settingsCollection, calculatedFields) {
        // First, reset the cache and
        this.reset(events);

        // // if we have been passed a collection of settings, use this to populate the cache
        if (settingsCollection && settingsCollection.models) {
            _.each(settingsCollection.models, updateSettingFromModel);
        }

        _calculatedFields = Array.isArray(calculatedFields) ? calculatedFields : [];

        // Bind to events to automatically keep up-to-date
        events.on('settings.edited', updateSettingFromModel);
        events.on('settings.added', updateSettingFromModel);
        events.on('settings.deleted', updateSettingFromModel);

        // set and bind calculated fields
        _calculatedFields.forEach((field) => {
            updateCalculatedField(field)();
            field.dependents.forEach((dependent) => {
                events.on(`settings.${dependent}.edited`, updateCalculatedField(field));
            });
        });

        return settingsCache;
    },

    /**
     * Reset both the cache and the listeners, must be called during init
     * @param {EventEmitter} events
     */
    reset(events) {
        settingsCache = {};

        events.removeListener('settings.edited', updateSettingFromModel);
        events.removeListener('settings.added', updateSettingFromModel);
        events.removeListener('settings.deleted', updateSettingFromModel);

        //unbind calculated fields
        _calculatedFields.forEach((field) => {
            field.dependents.forEach((dependent) => {
                events.removeListener(`settings.${dependent}.edited`, updateCalculatedField(field));
            });
        });

        _calculatedFields = [];
    }
};
