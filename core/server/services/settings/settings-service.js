/**
 * Settings Lib
 * A collection of utilities for handling settings including a cache
 */
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const events = require('../../lib/common/events');
const models = require('../../models');
const labs = require('../../../shared/labs');
const config = require('../../../shared/config');
const SettingsCache = require('../../../shared/settings-cache');
const SettingsBREADService = require('./settings-bread-service');
const {obfuscatedSetting, isSecretSetting, hideValueIfSecret} = require('./settings-utils');

const ObjectId = require('bson-objectid');

const messages = {
    incorrectKeyType: 'type must be one of "direct" or "connect".'
};

/**
 * @returns {SettingsBREADService} instance of the PostsService
 */
const getSettingsBREADServiceInstance = () => {
    return new SettingsBREADService({
        SettingsModel: models.Settings,
        settingsCache: SettingsCache,
        labsService: labs
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
        const settingsCollection = await models.Settings.populateDefaults();
        SettingsCache.init(events, settingsCollection, this.getCalculatedFields());
    },

    /**
     * Restore the cache, used during e2e testing only
     */
    reset() {
        SettingsCache.reset(events);
    },

    isMembersEnabled() {
        return SettingsCache.get('members_signup_access') !== 'none';
    },

    isMembersInviteOnly() {
        return SettingsCache.get('members_signup_access') === 'invite';
    },

    /**
     * @param {'direct' | 'connect'} type - The "type" of keys to fetch from settings
     * @returns {{publicKey: string, secretKey: string} | null}
     */
    getStripeKeys(type) {
        if (type !== 'direct' && type !== 'connect') {
            throw new errors.IncorrectUsageError({message: tpl(messages.incorrectKeyType)});
        }

        const secretKey = SettingsCache.get(`stripe_${type === 'connect' ? 'connect_' : ''}secret_key`);
        const publicKey = SettingsCache.get(`stripe_${type === 'connect' ? 'connect_' : ''}publishable_key`);

        if (!secretKey || !publicKey) {
            return null;
        }

        return {
            secretKey,
            publicKey
        };
    },

    /**
     * @returns {{publicKey: string, secretKey: string} | null}
     */
    getActiveStripeKeys() {
        const stripeDirect = config.get('stripeDirect');

        if (stripeDirect) {
            return this.getStripeKeys('direct');
        }

        const connectKeys = this.getStripeKeys('connect');

        if (!connectKeys) {
            return this.getStripeKeys('direct');
        }

        return connectKeys;
    },

    arePaidMembersEnabled() {
        return this.isMembersEnabled() && this.getActiveStripeKeys() !== null;
    },

    getFirstpromoterId() {
        if (!SettingsCache.get('firstpromoter')) {
            return null;
        }
        return SettingsCache.get('firstpromoter_id');
    },

    /**
     *
     */
    getCalculatedFields() {
        const fields = [];

        fields.push(new CalculatedField({key: 'members_enabled', type: 'boolean', group: 'members', fn: this.isMembersEnabled.bind(this), dependents: ['members_signup_access']}));
        fields.push(new CalculatedField({key: 'members_invite_only', type: 'boolean', group: 'members', fn: this.isMembersInviteOnly.bind(this), dependents: ['members_signup_access']}));
        fields.push(new CalculatedField({key: 'paid_members_enabled', type: 'boolean', group: 'members', fn: this.arePaidMembersEnabled.bind(this), dependents: ['members_signup_access', 'stripe_secret_key', 'stripe_publishable_key', 'stripe_connect_secret_key', 'stripe_connect_publishable_key']}));
        fields.push(new CalculatedField({key: 'firstpromoter_account', type: 'string', group: 'firstpromoter', fn: this.getFirstpromoterId.bind(this), dependents: ['firstpromoter', 'firstpromoter_id']}));

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
