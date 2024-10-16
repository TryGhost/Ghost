/**
 * Settings Lib
 * A collection of utilities for handling settings including a cache
 */
const events = require('../../lib/common/events');
const models = require('../../models');
const labs = require('../../../shared/labs');
const adapterManager = require('../adapter-manager');
const SettingsCache = require('../../../shared/settings-cache');
const SettingsBREADService = require('./SettingsBREADService');
const {obfuscatedSetting, isSecretSetting, hideValueIfSecret} = require('./settings-utils');
const mail = require('../mail');
const SingleUseTokenProvider = require('../members/SingleUseTokenProvider');
const urlUtils = require('../../../shared/url-utils');

const ObjectId = require('bson-objectid').default;
const settingsHelpers = require('../settings-helpers');
const emailAddressService = require('../email-address');

const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;
const MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE = 10 * 60 * 1000;
const MAGIC_LINK_TOKEN_MAX_USAGE_COUNT = 3;

/**
 * @returns {SettingsBREADService} instance of the PostsService
 */
const getSettingsBREADServiceInstance = () => {
    return new SettingsBREADService({
        SettingsModel: models.Settings,
        settingsCache: SettingsCache,
        labsService: labs,
        mail,
        singleUseTokenProvider: new SingleUseTokenProvider({
            SingleUseTokenModel: models.SingleUseToken,
            validityPeriod: MAGIC_LINK_TOKEN_VALIDITY,
            validityPeriodAfterUsage: MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE,
            maxUsageCount: MAGIC_LINK_TOKEN_MAX_USAGE_COUNT
        }),
        urlUtils,
        emailAddressService: emailAddressService
    });
};

class CalculatedField {
    constructor({key, type, group, fn, dependents}) {
        this.key = key;
        this.type = type;
        this.group = group;
        this.fn = fn;
        this.dependents = dependents;
    }

    getSetting() {
        return {
            key: this.key,
            type: this.type,
            group: this.group,
            value: this.fn(),
            // @TODO: remove this hack
            id: ObjectId().toHexString(),
            created_at: new Date().toISOString().replace(/\d{3}Z$/, '000Z'),
            updated_at: new Date().toISOString().replace(/\d{3}Z$/, '000Z')
        };
    }
}

module.exports = {
    /**
     * Initialize the cache, used in boot and in testing
     */
    async init() {
        const cacheStore = adapterManager.getAdapter('cache:settings');
        const settingsCollection = await models.Settings.populateDefaults();
        SettingsCache.init(events, settingsCollection, this.getCalculatedFields(), cacheStore);
    },

    /**
     * Restore the cache, used during e2e testing only
     */
    reset() {
        SettingsCache.reset(events);
    },

    /**
     *
     */
    getCalculatedFields() {
        const fields = [];

        fields.push(new CalculatedField({key: 'members_enabled', type: 'boolean', group: 'members', fn: settingsHelpers.isMembersEnabled.bind(settingsHelpers), dependents: ['members_signup_access']}));
        fields.push(new CalculatedField({key: 'members_invite_only', type: 'boolean', group: 'members', fn: settingsHelpers.isMembersInviteOnly.bind(settingsHelpers), dependents: ['members_signup_access']}));
        fields.push(new CalculatedField({key: 'allow_self_signup', type: 'boolean', group: 'members', fn: settingsHelpers.allowSelfSignup.bind(settingsHelpers), dependents: ['members_signup_access', 'portal_plans', 'stripe_secret_key', 'stripe_publishable_key', 'stripe_connect_secret_key', 'stripe_connect_publishable_key']}));
        fields.push(new CalculatedField({key: 'paid_members_enabled', type: 'boolean', group: 'members', fn: settingsHelpers.arePaidMembersEnabled.bind(settingsHelpers), dependents: ['members_signup_access', 'stripe_secret_key', 'stripe_publishable_key', 'stripe_connect_secret_key', 'stripe_connect_publishable_key']}));
        fields.push(new CalculatedField({key: 'firstpromoter_account', type: 'string', group: 'firstpromoter', fn: settingsHelpers.getFirstpromoterId.bind(settingsHelpers), dependents: ['firstpromoter', 'firstpromoter_id']}));
        fields.push(new CalculatedField({key: 'donations_enabled', type: 'boolean', group: 'donations', fn: settingsHelpers.areDonationsEnabled.bind(settingsHelpers), dependents: ['stripe_secret_key', 'stripe_publishable_key', 'stripe_connect_secret_key', 'stripe_connect_publishable_key']}));

        // E-mail addresses
        fields.push(new CalculatedField({key: 'default_email_address', type: 'string', group: 'email', fn: settingsHelpers.getDefaultEmailAddress.bind(settingsHelpers), dependents: ['labs']}));
        fields.push(new CalculatedField({key: 'support_email_address', type: 'string', group: 'email', fn: settingsHelpers.getMembersSupportAddress.bind(settingsHelpers), dependents: ['labs', 'members_support_address']}));

        return fields;
    },

    /**
     * Handles synchronization of routes.yaml hash loaded in the frontend with
     * the value stored in the settings table.
     * getRoutesHash is a function to allow keeping "frontend" decoupled from settings
     *
     * @param {function} getRoutesHash function fetching currently loaded routes file hash
     */
    async syncRoutesHash(getRoutesHash) {
        const currentRoutesHash = await getRoutesHash();

        if (SettingsCache.get('routes_hash') !== currentRoutesHash) {
            return await models.Settings.edit([{
                key: 'routes_hash',
                value: currentRoutesHash
            }], {context: {internal: true}});
        }
    },

    /**
     * Handles email setting synchronization when email has been verified per instance
     *
     * @param {boolean} configValue current email verification value from local config
     */
    async syncEmailSettings(configValue) {
        const isEmailDisabled = SettingsCache.get('email_verification_required');

        if (configValue === true && isEmailDisabled) {
            return await models.Settings.edit([{
                key: 'email_verification_required',
                value: false
            }], {context: {internal: true}});
        }
    },

    obfuscatedSetting,
    isSecretSetting,
    hideValueIfSecret,
    getSettingsBREADServiceInstance
};
