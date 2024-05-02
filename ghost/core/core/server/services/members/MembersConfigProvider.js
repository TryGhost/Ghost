const logging = require('@tryghost/logging');
const {URL} = require('url');
const crypto = require('crypto');
const createKeypair = require('keypair');

class MembersConfigProvider {
    /**
     * @param {object} options
     * @param {{get: (key: string) => any}} options.settingsCache
     * @param {{getDefaultEmailDomain(): string, getMembersSupportAddress(): string, getNoReplyAddress(): string, isStripeConnected(): boolean}} options.settingsHelpers
     * @param {any} options.urlUtils
     */
    constructor({settingsCache, settingsHelpers, urlUtils}) {
        this._settingsCache = settingsCache;
        this._settingsHelpers = settingsHelpers;
        this._urlUtils = urlUtils;
    }

    get defaultEmailDomain() {
        return this._settingsHelpers.getDefaultEmailDomain();
    }

    /**
     * @deprecated Use settingsHelpers.getNoReplyAddress or settingsHelpers.getMembersSupportAddress instead
     */
    getEmailFromAddress() {
        // Individual from addresses are set per newsletter - this is the fallback address
        return this._settingsHelpers.getNoReplyAddress();
    }

    /**
     * @deprecated Use settingsHelpers.getNoReplyAddress or settingsHelpers.getMembersSupportAddress instead
     */
    getEmailSupportAddress() {
        return this._settingsHelpers.getMembersSupportAddress();
    }

    /**
     * @deprecated Use settingsHelpers.isStripeConnected instead
     */
    isStripeConnected() {
        return this._settingsHelpers.isStripeConnected();
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

        // Always allow free signup because the theme might have a form to signup regardless of the Portal settings
        return true;
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

    getSigninURL(token, type, referrer) {
        const siteUrl = this._urlUtils.urlFor({relativeUrl: '/members/'}, true);
        const signinURL = new URL(siteUrl);
        signinURL.searchParams.set('token', token);
        signinURL.searchParams.set('action', type);
        if (referrer) {
            signinURL.searchParams.set('r', referrer);
        }
        return signinURL.toString();
    }
}

module.exports = MembersConfigProvider;
