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

/**
 * @typedef {Object} PublicSettingsCache
 * @property {string|null} title - The blog's title
 * @property {string|null} description - The blog's description
 * @property {string|null} logo - URL to the blog's logo
 * @property {string|null} icon - URL to the blog's icon
 * @property {string|null} accent_color - The blog's accent color
 * @property {string|null} cover_image - URL to the blog's cover image
 * @property {string|null} facebook - Facebook page name
 * @property {string|null} twitter - Twitter username
 * @property {string|null} lang - The blog's language code
 * @property {string|null} locale - The blog's locale
 * @property {string|null} timezone - The blog's timezone
 * @property {string|null} codeinjection_head - Code injected into head
 * @property {string|null} codeinjection_foot - Code injected into footer
 * @property {string|null} navigation - JSON string of navigation items
 * @property {string|null} secondary_navigation - JSON string of secondary navigation items
 * @property {string|null} meta_title - Custom meta title
 * @property {string|null} meta_description - Custom meta description
 * @property {string|null} og_image - Open Graph image URL
 * @property {string|null} og_title - Open Graph title
 * @property {string|null} og_description - Open Graph description
 * @property {string|null} twitter_image - Twitter card image URL
 * @property {string|null} twitter_title - Twitter card title
 * @property {string|null} twitter_description - Twitter card description
 * @property {string|null} members_support_address - Support email for members
 * @property {boolean|null} members_enabled - Whether members feature is enabled
 * @property {boolean|null} allow_self_signup - Whether self signup is allowed
 * @property {boolean|null} members_invite_only - Whether membership is invite only
 * @property {string|null} members_signup_access - Member signup access level
 * @property {boolean|null} paid_members_enabled - Whether paid memberships are enabled
 * @property {string|null} firstpromoter_account - FirstPromoter account ID
 * @property {string|null} portal_button_style - Portal button style
 * @property {string|null} portal_button_signup_text - Portal signup button text
 * @property {string|null} portal_button_icon - Portal button icon
 * @property {string|null} portal_signup_terms_html - Portal signup terms HTML
 * @property {boolean|null} portal_signup_checkbox_required - Whether signup checkbox is required
 * @property {string|null} portal_plans - JSON string of available portal plans
 * @property {string|null} portal_default_plan - Default portal plan
 * @property {boolean|null} portal_name - Whether to show portal names
 * @property {boolean|null} portal_button - Whether to show the portal button
 * @property {boolean|null} comments_enabled - Whether comments are enabled
 * @property {boolean|null} recommendations_enabled - Whether recommendations are enabled
 * @property {boolean|null} outbound_link_tagging - Whether outbound link tagging is enabled
 * @property {string|null} default_email_address - Default email address
 * @property {string|null} support_email_address - Support email address
 * @property {string|null} editor_default_email_recipients - Default email recipients for editor
 * @property {boolean|null} captcha_enabled - Whether captcha is enabled
 * @property {string|null} labs - JSON string of enabled labs features
 * @property {never} [x] - Prevent accessing undefined properties
 */

class CacheManager {
    /**
     * @prop {Object} options
     * @prop {Object} options.publicSettings - key/value pairs of settings which are publicly accessible
     */
    constructor({publicSettings}) {
        // settingsCache holds cached settings, keyed by setting.key, contains the JSON version of the model
        this.settingsCache;
        this.settingsOverrides = {};
        this.publicSettings = publicSettings;
        this.calculatedFields = [];

        this.get = this.get.bind(this);
        this.set = this.set.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getPublic = this.getPublic.bind(this);
        this.reset = this.reset.bind(this);
        this._doGet = this._doGet.bind(this);
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
        // NOTE: "!this.settingsCache" is for when setting's cache is used
        //       before it had a chance to initialize. Should be fixed when
        //       it is decoupled from the model layer
        if (!this.settingsCache) {
            return;
        }

        let override;
        if (this.settingsOverrides && Object.keys(this.settingsOverrides).includes(key)) {
            // Wrap the override value in an object in case it's a boolean
            override = {value: this.settingsOverrides[key]};
        }

        const cacheEntry = this.settingsCache.get(key);

        if (override) {
            cacheEntry.value = override.value;
            cacheEntry.is_read_only = true;
        }

        if (!cacheEntry) {
            return;
        }

        // Don't try to resolve to the value of the setting
        if (options && options.resolve === false) {
            return cacheEntry;
        }

        // TODO: I think we should be a little smarter here and deserialize the value based on the type
        //       rather than trying to parse everything as JSON, which is very slow when we do it hundreds
        //       of times per request.

        // Default behavior is to try to resolve the value and return that
        try {
            // CASE: handle literal false
            if (cacheEntry.value === false || cacheEntry.value === 'false') {
                return false;
            }

            // CASE: hotpath early return for strings which are already strings
            if (cacheEntry.type === 'string' && typeof cacheEntry.value === 'string') {
                return cacheEntry.value || null;
            }

            // CASE: if a string contains a number e.g. "1", JSON.parse will auto convert into integer
            if (!isNaN(Number(cacheEntry.value))) {
                return cacheEntry.value || null;
            }

            return JSON.parse(cacheEntry.value) || null;
        } catch (err) {
            return cacheEntry.value || null;
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
        this.settingsCache.set(key, _.cloneDeep(value));
    }

    /**
     * Get the entire cache object
     * Uses clone to prevent modifications from being reflected
     * This method is dangerous in case the cache is "lazily" initialized
     * could result in returning only a partially filled cache
     * @return {object} cache
     * @deprecated this method is not "cache-friendly" and should be avoided from further usage
     *             instead using multiple "get" calls
     */
    getAll() {
        const keys = this.settingsCache.keys();
        const all = {};

        keys.forEach((key) => {
            all[key] = _.cloneDeep(this.get(key, {resolve: false}));
        });

        return all;
    }

    /**
     * Get all the publicly accessible cache entries with their correct names
     * Uses clone to prevent modifications from being reflected
    * @return {PublicSettingsCache} cache
     */
    getPublic() {
        // This block correctly builds the type signature for the return value
        /** @type {PublicSettingsCache} */
        let settings = Object.fromEntries(
            Object.keys(this.publicSettings).map(key => [this.publicSettings[key], null])
        );

        // This block correctly populates the values from the cache
        for (const newKey in this.publicSettings) {
            settings[newKey] = this._doGet(this.publicSettings[newKey]) ?? null;
        }

        return settings;
    }

    /**
     * Initialize the cache
     *
     * Optionally takes a collection of settings & can populate the cache with these.
     *
     * @param {import('events').EventEmitter} events
     * @param {import('bookshelf').Collection<import('bookshelf').Model>} settingsCollection
     * @param {Array} calculatedFields
     * @param {Object} cacheStore - cache storage instance base on Cache Base Adapter
     * @param {Object} settingsOverrides - key/value pairs of settings which are overridden (i.e. via config)
     * @return {Object} - filled out instance for Cache Base Adapter
     */
    init(events, settingsCollection, calculatedFields, cacheStore, settingsOverrides) {
        this.settingsCache = cacheStore;
        this.settingsOverrides = settingsOverrides;
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
     * @param {import('events').EventEmitter} events
     */
    reset(events) {
        if (this.settingsCache) {
            this.settingsCache.reset();
        }

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
