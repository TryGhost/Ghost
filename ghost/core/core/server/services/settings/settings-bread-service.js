const _ = require('lodash');
const tpl = require('@tryghost/tpl');
const {NotFoundError, NoPermissionError, BadRequestError} = require('@tryghost/errors');
const {obfuscatedSetting, isSecretSetting, hideValueIfSecret} = require('./settings-utils');

const messages = {
    problemFindingSetting: 'Problem finding setting: {key}',
    accessCoreSettingFromExtReq: 'Attempted to access core setting from external request'
};

class SettingsBREADService {
    /**
     *
     * @param {Object} options
     * @param {Object} options.SettingsModel
     * @param {Object} options.settingsCache - SettingsCache instance
     * @param {Object} options.labsService - labs service instance
     */
    constructor({SettingsModel, settingsCache, labsService}) {
        this.SettingsModel = SettingsModel;
        this.settingsCache = settingsCache;
        this.labs = labsService;
    }

    /**
     *
     * @param {Object} context ghost API context instance
     * @returns
     */
    browse(context) {
        let settings = this.settingsCache.getAll();

        return this._formatBrowse(settings, context);
    }

    /**
     *
     * @param {String} key setting key
     * @param {Object} [context] API context instance
     * @returns {Object} an object with a filled out key that comes in a parameter
     */
    read(key, context) {
        let setting;

        if (key === 'slack') {
            const slackURL = this.settingsCache.get('slack_url', {resolve: false});
            const slackUsername = this.settingsCache.get('slack_username', {resolve: false});

            setting = slackURL || slackUsername;
            setting.key = 'slack';
            setting.value = [{
                url: slackURL && slackURL.value,
                username: slackUsername && slackUsername.value
            }];
        } else {
            setting = this.settingsCache.get(key, {resolve: false});
        }

        if (!setting) {
            return Promise.reject(new NotFoundError({
                message: tpl(messages.problemFindingSetting, {
                    key: key
                })
            }));
        }

        // @TODO: handle in settings model permissible fn
        if (setting.group === 'core' && !(context && context.internal)) {
            return Promise.reject(new NoPermissionError({
                message: tpl(messages.accessCoreSettingFromExtReq)
            }));
        }

        // NOTE: Labs flags can exist outside of the DB when they are forced on/off
        //       so we grab them from the labs service instead as that's source-of-truth
        if (setting.key === 'labs') {
            setting.value = JSON.stringify(this.labs.getAll());
        }

        setting = hideValueIfSecret(setting);

        return {
            [key]: setting
        };
    }

    /**
     *
     * @param {Object[]} settings
     * @param {Object} options
     * @param {Object} [options.context]
     * @param {Object} [stripeConnectData]
     * @returns
     */
    async edit(settings, options, stripeConnectData) {
        const filteredSettings = settings.filter((setting) => {
            // The `stripe_connect_integration_token` "setting" is only used to set the `stripe_connect_*` settings.
            return ![
                'stripe_connect_integration_token',
                'stripe_connect_publishable_key',
                'stripe_connect_secret_key',
                'stripe_connect_livemode',
                'stripe_connect_account_id',
                'stripe_connect_display_name'
            ].includes(setting.key)
                // Remove obfuscated settings
                && !(setting.value === obfuscatedSetting && isSecretSetting(setting));
        });

        const getSetting = setting => this.settingsCache.get(setting.key, {resolve: false});

        const firstUnknownSetting = filteredSettings.find(setting => !getSetting(setting));

        if (firstUnknownSetting) {
            throw new NotFoundError({
                message: tpl(messages.problemFindingSetting, {
                    key: firstUnknownSetting.key
                })
            });
        }

        if (!(options.context && options.context.internal)) {
            const firstCoreSetting = filteredSettings.find(setting => getSetting(setting).group === 'core');

            if (firstCoreSetting) {
                throw new NoPermissionError({
                    message: tpl(messages.accessCoreSettingFromExtReq)
                });
            }
        }

        if (stripeConnectData) {
            filteredSettings.push({
                key: 'stripe_connect_publishable_key',
                value: stripeConnectData.public_key
            });
            filteredSettings.push({
                key: 'stripe_connect_secret_key',
                value: stripeConnectData.secret_key
            });
            filteredSettings.push({
                key: 'stripe_connect_livemode',
                value: stripeConnectData.livemode
            });
            filteredSettings.push({
                key: 'stripe_connect_display_name',
                value: stripeConnectData.display_name
            });
            filteredSettings.push({
                key: 'stripe_connect_account_id',
                value: stripeConnectData.account_id
            });
        }

        return this.SettingsModel.edit(filteredSettings, options).then((result) => {
            return this._formatBrowse(_.keyBy(_.invokeMap(result, 'toJSON'), 'key'), options.context);
        });
    }

    /**
     *
     * @param {Object} stripeConnectIntegrationToken
     * @param {Function} getSessionProp sync function fetching property from session store
     * @param {Function} getStripeConnectTokenData async function retreiving Stripe Connect data for settings
     * @returns {Promise<Object>} resolves with an object with following keys: public_key, secret_key, livemode, display_name, account_id
     */
    async getStripeConnectData(stripeConnectIntegrationToken, getSessionProp, getStripeConnectTokenData) {
        if (stripeConnectIntegrationToken && stripeConnectIntegrationToken.value) {
            try {
                return await getStripeConnectTokenData(stripeConnectIntegrationToken.value, getSessionProp);
            } catch (err) {
                throw new BadRequestError({
                    err,
                    message: 'The Stripe Connect token could not be parsed.'
                });
            }
        }
    }

    _formatBrowse(inputSettings, context) {
        let settings = _.values(inputSettings);
        // CASE: no context passed (functional call)
        if (!context) {
            return Promise.resolve(settings.filter((setting) => {
                return setting.group === 'site';
            }));
        }

        if (!context.internal) {
            // CASE: omit core settings unless internal request
            settings = _.filter(settings, (setting) => {
                const isCore = setting.group === 'core';
                return !isCore;
            });
            // CASE: omit secret settings unless internal request
            settings = settings.map(hideValueIfSecret);
        }

        // NOTE: Labs flags can exist outside of the DB when they are forced on/off
        //       so we grab them from the labs service instead as that's source-of-truth
        const labsSetting = settings.find(setting => setting.key === 'labs');
        if (labsSetting) {
            labsSetting.value = JSON.stringify(this.labs.getAll());
        }

        return settings;
    }
}

module.exports = SettingsBREADService;
