const _ = require('lodash');
const tpl = require('@tryghost/tpl');
const {NotFoundError, NoPermissionError, BadRequestError, IncorrectUsageError} = require('@tryghost/errors');
const {obfuscatedSetting, isSecretSetting, hideValueIfSecret} = require('./settings-utils');
const logging = require('@tryghost/logging');
const MagicLink = require('@tryghost/magic-link');
const verifyEmailTemplate = require('./emails/verify-email');

const EMAIL_KEYS = ['members_support_address'];
const messages = {
    problemFindingSetting: 'Problem finding setting: {key}',
    accessCoreSettingFromExtReq: 'Attempted to access core setting from external request'
};

class SettingsBREADService {
    /**
     *
     * @param {Object} options
     * @param {Object} options.SettingsModel
     * @param {Object} options.mail
     * @param {Object} options.settingsCache - SettingsCache instance
     * @param {Object} options.singleUseTokenProvider
     * @param {Object} options.urlUtils
     * @param {Object} options.labsService - labs service instance
     */
    constructor({SettingsModel, settingsCache, labsService, mail, singleUseTokenProvider, urlUtils}) {
        this.SettingsModel = SettingsModel;
        this.settingsCache = settingsCache;
        this.labs = labsService;

        /* email verification setup */

        this.ghostMailer = new mail.GhostMailer();

        const {transporter, getSubject, getText, getHTML, getSigninURL} = {
            transporter: {
                sendMail() {
                    // noop - overridden in `sendEmailVerificationMagicLink`
                }
            },
            getSubject() {
                // not used - overridden in `sendEmailVerificationMagicLink`
                return `Verify email address`;
            },
            getText(url, type, email) {
                return `
                Hey there,

                Please confirm your email address with this link:

                ${url}

                For your security, the link will expire in 24 hours time.

                ---

                Sent to ${email}
                If you did not make this request, you can simply delete this message. This email address will not be used.
                `;
            },
            getHTML(url, type, email) {
                return verifyEmailTemplate({url, email});
            },
            getSigninURL(token) {
                // @todo: need to make this more generic?
                const adminUrl = urlUtils.urlFor('admin', true);
                const signinURL = new URL(adminUrl);
                signinURL.hash = `/settings/members/?verifyEmail=${token}`;
                return signinURL.href;
            }
        };

        this.magicLinkService = new MagicLink({
            transporter,
            tokenProvider: singleUseTokenProvider,
            getSigninURL,
            getText,
            getHTML,
            getSubject
        });
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
        let filteredSettings = settings.filter((setting) => {
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

        // remove any email properties that are not allowed to be set without verification
        const {filteredSettings: refilteredSettings, emailsToVerify} = await this.prepSettingsForEmailVerification(filteredSettings, getSetting);

        const modelArray = await this.SettingsModel.edit(refilteredSettings, options).then((result) => {
            // TODO: temporary fix for starting/stopping lexicalMultiplayer service when labs flag is changed
            //       this should be removed along with the flag, or set up in a more generic way
            const labsSetting = result.find(setting => setting.get('key') === 'labs');
            if (labsSetting) {
                const lexicalMultiplayer = require('../lexical-multiplayer');
                const previous = JSON.parse(labsSetting.previousAttributes().value);
                const current = JSON.parse(labsSetting.get('value'));

                if (!previous.lexicalMultiplayer && current.lexicalMultiplayer) {
                    lexicalMultiplayer.enable();
                } else if (previous.lexicalMultiplayer && !current.lexicalMultiplayer) {
                    lexicalMultiplayer.disable();
                }
            }

            return this._formatBrowse(_.keyBy(_.invokeMap(result, 'toJSON'), 'key'), options.context);
        });

        return this.respondWithEmailVerification(modelArray, emailsToVerify);
    }

    async verifyKeyUpdate(token) {
        const data = await this.magicLinkService.getDataFromToken(token);
        const {key, value} = data;

        // Verify keys (in case they ever change and we have old tokens)
        if (!EMAIL_KEYS.includes(key)) {
            throw new IncorrectUsageError({
                message: 'Not allowed to update this setting key via tokens'
            });
        }

        return this.SettingsModel.edit({
            key,
            value
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

    /**
     * @private
     */
    async prepSettingsForEmailVerification(settings, getSetting) {
        const filteredSettings = [];
        const emailsToVerify = [];

        for (const setting of settings) {
            if (EMAIL_KEYS.includes(setting.key)) {
                const email = setting.value;
                const key = setting.key;
                const hasChanged = getSetting(setting).value !== email;

                if (await this.requiresEmailVerification({email, hasChanged})) {
                    emailsToVerify.push({email, key});
                } else {
                    filteredSettings.push(setting);
                }
            } else {
                filteredSettings.push(setting);
            }
        }

        return {filteredSettings, emailsToVerify};
    }

    /**
     * @private
     */
    async requiresEmailVerification({email, hasChanged}) {
        if (!email || !hasChanged || email === 'noreply') {
            return false;
        }

        // TODO: check for known/verified email

        return true;
    }

    /**
     * @private
     */
    async respondWithEmailVerification(settings, emailsToVerify) {
        if (emailsToVerify.length > 0) {
            for (const {email, key} of emailsToVerify) {
                await this.sendEmailVerificationMagicLink({email, key});
            }

            settings.meta = settings.meta || {};
            settings.meta.sent_email_verification = emailsToVerify.map(v => v.key);
        }

        return settings;
    }

    /**
     * @private
     */
    async sendEmailVerificationMagicLink({email, key}) {
        const [,toDomain] = email.split('@');

        let fromEmail = `noreply@${toDomain}`;
        if (fromEmail === email) {
            fromEmail = `no-reply@${toDomain}`;
        }

        const {ghostMailer} = this;

        this.magicLinkService.transporter = {
            sendMail(message) {
                if (process.env.NODE_ENV !== 'production') {
                    logging.warn(message.text);
                }
                let msg = Object.assign({
                    from: fromEmail,
                    subject: 'Verify email address',
                    forceTextContent: true
                }, message);

                return ghostMailer.send(msg);
            }
        };

        return this.magicLinkService.sendMagicLink({email, tokenData: {key, value: email}});
    }
}

module.exports = SettingsBREADService;
