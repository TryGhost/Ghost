const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const {URL} = require('url');
const crypto = require('crypto');
const createKeypair = require('keypair');

const messages = {
    incorrectKeyType: 'type must be one of "direct" or "connect".'
};

class MembersConfigProvider {
    /**
     * @param {object} options
     * @param {{get: (key: string) => any}} options.settingsCache
     * @param {{get: (key: string) => any}} options.config
     * @param {any} options.urlUtils
     */
    constructor(options) {
        this._settingsCache = options.settingsCache;
        this._config = options.config;
        this._urlUtils = options.urlUtils;
    }

    /**
     * @private
     */
    _getDomain() {
        const url = this._urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
        const domain = (url && url[1]) || '';
        if (domain.startsWith('www.')) {
            return domain.replace(/^(www)\.(?=[^/]*\..{2,5})/, '');
        }
        return domain;
    }

    getEmailFromAddress() {
        // Individual from addresses are set per newsletter - this is the fallback address
        return `noreply@${this._getDomain()}`;
    }

    getEmailSupportAddress() {
        const supportAddress = this._settingsCache.get('members_support_address') || 'noreply';

        // Any fromAddress without domain uses site domain, like default setting `noreply`
        if (supportAddress.indexOf('@') < 0) {
            return `${supportAddress}@${this._getDomain()}`;
        }
        return supportAddress;
    }

    getAuthEmailFromAddress() {
        return this.getEmailSupportAddress() || this.getEmailFromAddress();
    }

    /**
     * @param {'direct' | 'connect'} type - The "type" of keys to fetch from settings
     * @returns {{publicKey: string, secretKey: string} | null}
     */
    getStripeKeys(type) {
        if (type !== 'direct' && type !== 'connect') {
            throw new errors.IncorrectUsageError({message: tpl(messages.incorrectKeyType)});
        }

        const secretKey = this._settingsCache.get(`stripe_${type === 'connect' ? 'connect_' : ''}secret_key`);
        const publicKey = this._settingsCache.get(`stripe_${type === 'connect' ? 'connect_' : ''}publishable_key`);

        if (!secretKey || !publicKey) {
            return null;
        }

        return {
            secretKey,
            publicKey
        };
    }

    /**
     * @returns {{publicKey: string, secretKey: string} | null}
     */
    getActiveStripeKeys() {
        const stripeDirect = this._config.get('stripeDirect');

        if (stripeDirect) {
            return this.getStripeKeys('direct');
        }

        const connectKeys = this.getStripeKeys('connect');

        if (!connectKeys) {
            return this.getStripeKeys('direct');
        }

        return connectKeys;
    }

    isStripeConnected() {
        return this.getActiveStripeKeys() !== null;
    }

    getAuthSecret() {
        const hexSecret = this._settingsCache.get('members_email_auth_secret');
        if (!hexSecret) {
            logging.warn('Could not find members_email_auth_secret, using dynamically generated secret');
            return crypto.randomBytes(64);
        }
        const secret = Buffer.from(hexSecret, 'hex');
        if (secret.length < 64) {
            logging.warn('members_email_auth_secret not large enough (64 bytes), using dynamically generated secret');
            return crypto.randomBytes(64);
        }
        return secret;
    }

    getAllowSelfSignup() {
        // 'invite' and 'none' members signup access disables all signup
        if (this._settingsCache.get('members_signup_access') !== 'all') {
            return false;
        }

        // if stripe is not connected then selected plans mean nothing.
        // disabling signup would be done by switching to "invite only" mode
        if (!this.isStripeConnected()) {
            return true;
        }

        // self signup must be available for free plan signup to work
        const hasFreePlan = this._settingsCache.get('portal_plans').includes('free');
        if (hasFreePlan) {
            return true;
        }

        // signup access is enabled but there's no free plan, don't allow self signup
        return false;
    }

    getTokenConfig() {
        const membersApiUrl = this._urlUtils.urlFor({relativeUrl: '/members/api'}, true);

        let privateKey = this._settingsCache.get('members_private_key');
        let publicKey = this._settingsCache.get('members_public_key');

        if (!privateKey || !publicKey) {
            logging.warn('Could not find members_private_key, using dynamically generated keypair');
            const keypair = createKeypair({bits: 1024});
            privateKey = keypair.private;
            publicKey = keypair.public;
        }

        return {
            issuer: membersApiUrl,
            publicKey,
            privateKey
        };
    }

    getSigninURL(token, type) {
        const siteUrl = this._urlUtils.urlFor({relativeUrl: '/members/'}, true);
        const signinURL = new URL(siteUrl);
        signinURL.searchParams.set('token', token);
        signinURL.searchParams.set('action', type);
        return signinURL.toString();
    }
}

module.exports = MembersConfigProvider;
