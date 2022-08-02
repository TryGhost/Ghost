// It's important to keep the requires absolutely minimal here,
// As this cache is used in SO many other areas, we may open ourselves to
// circular dependency bugs.
const debug = require('@tryghost/debug')('settings:cache');
const _ = require('lodash');

/**
 * Why hasn't this been moved to @tryghost/settings-cache yet?
 *
 * - It currently still couples the frontend and server together in a weird way via the event system
 * - See the notes in core/server/lib/common/events
 * - There's also a plan to introduce a proper caching layer, and rewrite this on top of that
 */
class CacheManager {
    /**
     * @prop {Object} options
     * @prop {{}} options.cache - object of objects. Holds cached settings, keyed by setting.key, contains the JSON version of the model
     * @prop {Object} options.publicSettings - key/value pairs of settings which are publicly accessible
     */
    constructor({cache, publicSettings}) {
        this.settingsCache = cache;
        this.publicSettings = publicSettings;
        this.calculatedFields = [];

        this._updateSettingFromModel = this._updateSettingFromModel.bind(this);
        this._updateCalculatedField = this._updateCalculatedField.bind(this);
    }

    // Local function, only ever used for initializing
    // We deliberately call "set" on each model so that set is a consistent interface
    _updateSettingFromModel(settingModel) {
        debug('Auto updating', settingModel.get('key'));
        this.set(settingModel.get('key'), settingModel.toJSON());
    }

    _updateCalculatedField(field) {
        return () => {
            debug('Auto updating', field.key);
            this.set(field.key, field.getSetting());
        };
    }

    _doGet(key, options) {
        if (!this.settingsCache[key]) {
            return;
        }

        // Don't try to resolve to the value of the setting
        if (options && options.resolve === false) {
            return this.settingsCache[key];
        }

        // Default behaviour is to try to resolve the value and return that
        try {
            // CASE: handle literal false
            if (this.settingsCache[key].value === false || this.settingsCache[key].value === 'false') {
                return false;
            }

            // CASE: if a string contains a number e.g. "1", JSON.parse will auto convert into integer
            if (!isNaN(Number(this.settingsCache[key].value))) {
                return this.settingsCache[key].value || null;
            }

            return JSON.parse(this.settingsCache[key].value) || null;
        } catch (err) {
            return this.settingsCache[key].value || null;
        }
    }

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
     *
     * Get a key from the this.settingsCache
     * Will resolve to the value, including parsing JSON, unless {resolve: false} is passed in as an option
     * In which case the full JSON version of the model will be resolved
     *
     * @param {string} key
     * @param {object} options
     * @return {*}
     */
    get(key, options) {
        return this._doGet(key, options);
    }

    /**
     * Set a key on the cache
     * The only way to get an object into the cache
     * Uses clone to prevent modifications from being reflected
     * @param {string} key
     * @param {object} value json version of settings model
     */
    set(key, value) {
        this.settingsCache[key] = _.cloneDeep(value);
    }

    /**
     * Get the entire cache object
     * Uses clone to prevent modifications from being reflected
     * @return {object} cache
     */
    getAll() {
        return _.cloneDeep(this.settingsCache);
    }

    /**
     * Get all the publically accessible cache entries with their correct names
     * Uses clone to prevent modifications from being reflected
     * @return {object} cache
     */
    getPublic() {
        let settings = {};

        _.each(this.publicSettings, (key, newKey) => {
            settings[newKey] = this._doGet(key) ?? null;
        });

        return settings;
    }

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
            _.each(settingsCollection.models, this._updateSettingFromModel);
        }

        this.calculatedFields = Array.isArray(calculatedFields) ? calculatedFields : [];

        // Bind to events to automatically keep up-to-date
        events.on('settings.edited', this._updateSettingFromModel);
        events.on('settings.added', this._updateSettingFromModel);
        events.on('settings.deleted', this._updateSettingFromModel);

        // set and bind calculated fields
        this.calculatedFields.forEach((field) => {
            this._updateCalculatedField(field)();
            field.dependents.forEach((dependent) => {
                events.on(`settings.${dependent}.edited`, this._updateCalculatedField(field));
            });
        });

        return this.settingsCache;
    }

    /**
     * Reset both the cache and the listeners, must be called during init
     * @param {EventEmitter} events
     */
    reset(events) {
        this.settingsCache = {};

        events.removeListener('settings.edited', this._updateSettingFromModel);
        events.removeListener('settings.added', this._updateSettingFromModel);
        events.removeListener('settings.deleted', this._updateSettingFromModel);

        //unbind calculated fields
        this.calculatedFields.forEach((field) => {
            field.dependents.forEach((dependent) => {
                events.removeListener(`settings.${dependent}.edited`, this._updateCalculatedField(field));
            });
        });

        this.calculatedFields = [];
    }
}

module.exports = CacheManager;
