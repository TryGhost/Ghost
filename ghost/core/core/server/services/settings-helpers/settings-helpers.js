const net = require('net');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const EmailAddressParser = require('../email-address/email-address-parser');
const logging = require('@tryghost/logging');
const crypto = require('crypto');
const debug = require('@tryghost/debug')('services:settings-helpers');

const messages = {
    incorrectKeyType: 'type must be one of "direct" or "connect".'
};

class SettingsHelpers {
    constructor({settingsCache, urlUtils, config, labs, limitService}) {
        this.settingsCache = settingsCache;
        this.urlUtils = urlUtils;
        this.config = config;
        this.labs = labs;
        this.limitService = limitService;
    }

    isMembersEnabled() {
        return this.settingsCache.get('members_signup_access') !== 'none';
    }

    isMembersInviteOnly() {
        return this.settingsCache.get('members_signup_access') === 'invite';
    }

    allowSelfSignup() {
        return this.settingsCache.get('members_signup_access') === 'all';
    }

    /**
     * @param {'direct' | 'connect'} type - The "type" of keys to fetch from settings
     * @returns {{publicKey: string, secretKey: string} | null}
     */
    getStripeKeys(type) {
        if (type !== 'direct' && type !== 'connect') {
            throw new errors.IncorrectUsageError({message: tpl(messages.incorrectKeyType)});
        }

        const secretKey = this.settingsCache.get(`stripe_${type === 'connect' ? 'connect_' : ''}secret_key`);
        const publicKey = this.settingsCache.get(`stripe_${type === 'connect' ? 'connect_' : ''}publishable_key`);

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
        const stripeDirect = this.config.get('stripeDirect');

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

    arePaidMembersEnabled() {
        return this.isMembersEnabled() && this.isStripeConnected();
    }

    getFirstpromoterId() {
        if (!this.settingsCache.get('firstpromoter')) {
            return null;
        }
        return this.settingsCache.get('firstpromoter_id');
    }

    /**
     * @deprecated
     * Please don't make up new email addresses: use the default email addresses
     */
    getDefaultEmailDomain() {
        if (this.#managedEmailEnabled()) {
            const customSendingDomain = this.#managedSendingDomain();
            if (customSendingDomain) {
                return customSendingDomain;
            }
        }

        const url = this.urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
        const domain = (url && url[1]) || '';
        if (domain.startsWith('www.')) {
            return domain.substring('www.'.length);
        }
        return domain;
    }

    /**
     * Retrieves the member validation key from the settings cache. The intent is for this key to be used where member
     *  auth is not required. For example, unsubscribe links in emails, which are required to be one-click unsubscribe.
     *
     * @returns {string} The member validation key.
     */
    getMembersValidationKey() {
        return this.settingsCache.get('members_email_auth_secret');
    }

    getMembersSupportAddress() {
        let supportAddress = this.settingsCache.get('members_support_address');

        if (!supportAddress) {
            // In the new flow, we make a difference between an empty setting (= use default) and a 'noreply' setting (=use noreply @ domain)
            // Also keep the name of the default email!
            return EmailAddressParser.stringify(this.getDefaultEmail());
        }

        supportAddress = supportAddress || 'noreply';

        // Any fromAddress without domain uses site domain, like default setting `noreply`
        if (supportAddress.indexOf('@') < 0) {
            return `${supportAddress}@${this.getDefaultEmailDomain()}`;
        }
        return supportAddress;
    }

    /**
     * @deprecated Use getDefaultEmail().address (without name) or EmailAddressParser.stringify(this.getDefaultEmail()) (with name) instead
     */
    getNoReplyAddress() {
        return this.getDefaultEmailAddress();
    }

    getDefaultEmailAddress() {
        return this.getDefaultEmail().address;
    }

    getDefaultEmail() {
        // parse the email here and remove the sender name
        // E.g. when set to "bar" <from@default.com>
        const configAddress = this.config.get('mail:from');
        const parsed = EmailAddressParser.parse(configAddress);
        if (parsed) {
            return parsed;
        }

        // For missing configs, we default to the old flow
        logging.warn('Missing mail.from config, falling back to a generated email address. Please update your config file and set a valid from address');
        return {
            address: this.getLegacyNoReplyAddress()
        };
    }

    /**
     * @deprecated
     * Please start using the new EmailAddressService
     */
    getLegacyNoReplyAddress() {
        return `noreply@${this.getDefaultEmailDomain()}`;
    }

    areDonationsEnabled() {
        return this.isStripeConnected() && this.config.get('enableTipsAndDonations');
    }

    createUnsubscribeUrl(uuid, options = {}) {
        const siteUrl = this.urlUtils.urlFor('home', true);
        const unsubscribeUrl = new URL(siteUrl);
        const key = this.getMembersValidationKey();
        unsubscribeUrl.pathname = `${unsubscribeUrl.pathname}/unsubscribe/`.replace('//', '/');
        if (uuid) {
            // hash key with member uuid for verification (and to not leak uuid) - it's possible to update member email prefs without logging in
            // @ts-ignore
            const hmac = crypto.createHmac('sha256', key).update(`${uuid}`).digest('hex');
            unsubscribeUrl.searchParams.set('uuid', uuid);
            unsubscribeUrl.searchParams.set('key', hmac);
        } else {
            unsubscribeUrl.searchParams.set('preview', '1');
        }
        if (options.newsletterUuid) {
            unsubscribeUrl.searchParams.set('newsletter', options.newsletterUuid);
        }
        if (options.comments) {
            unsubscribeUrl.searchParams.set('comments', '1');
        }

        return unsubscribeUrl.href;
    }

    /**
     * Generates an array of the blocked email domains from both config and settings
     * Normalizes the stored values by trimming, converting to lowercase and keeping only the email domain, e.g. 'hello@spam.xyz' -> 'spam.xyz'
     * Filters out domains without a dot
     * Returns an array of unique domains
     *
     * @returns {string[]}
     */
    getAllBlockedEmailDomains() {
        let configBlocklist = this.config.get('spam:blocked_email_domains') || [];
        let settingsBlocklist = this.settingsCache.get('blocked_email_domains') || [];

        const normaliseDomains = domain => domain && domain.trim().toLowerCase().split('@').pop();
        const filterValidDomains = domain => domain && domain.includes('.');

        configBlocklist = Array.isArray(configBlocklist) ? configBlocklist.map(normaliseDomains).filter(filterValidDomains) : [];
        settingsBlocklist = Array.isArray(settingsBlocklist) ? settingsBlocklist.map(normaliseDomains).filter(filterValidDomains) : [];

        return Array.from(new Set([
            ...configBlocklist,
            ...settingsBlocklist
        ]));
    }

    /**
     * Calculated setting for Social web (ActivityPub)
     *
     * @returns {boolean}
     */
    isSocialWebEnabled() {
        // UI setting
        if (this.settingsCache.get('social_web') !== true) {
            debug('Social web is disabled in settings');
            return false;
        }

        // Private sites cannot use social web
        if (this.settingsCache.get('is_private') === true) {
            debug('Social web is not available for private sites');
            return false;
        }

        // Ghost (Pro) limits
        if (this.limitService.isDisabled('limitSocialWeb')) {
            debug('Social web is not available for Ghost (Pro) sites without a custom domain, or hosted on a subdirectory');
            return false;
        }

        // Social web (ActivityPub) currently does not support Ghost sites hosted on a subdirectory, e.g. https://example.com/blog/
        const subdirectory = this.urlUtils.getSubdir();
        if (subdirectory) {
            debug('Social web is not available for Ghost sites hosted on a subdirectory');
            return false;
        }

        // Self-hosters cannot connect to production ActivityPub servers from localhost or IPs addresses
        const siteUrl = new URL(this.urlUtils.getSiteUrl());
        const isLocalhost = siteUrl.hostname === 'localhost' || siteUrl.hostname === '127.0.0.1' || siteUrl.hostname === '::1';
        const isIP = net.isIP(siteUrl.hostname);
        if (process.env.NODE_ENV === 'production' && (isLocalhost || isIP)) {
            debug('Social web is not available from localhost or IPs addresses in production');
            return false;
        }

        return true;
    }

    /**
     * Calculated setting for Web analytics
     *
     *  Setting > Labs Flag > Config > Limit Service
     *
     * @returns {boolean}
     */
    isWebAnalyticsEnabled() {
        // UI setting
        if (this.settingsCache.get('web_analytics') !== true) {
            debug('Web analytics is disabled in settings');
            return false;
        }

        // Check if web analytics can be configured (limit service and required config)
        if (!this.isWebAnalyticsConfigured()) {
            return false;
        }

        return true;
    }

    /**
     * Check if web analytics can be configured (used for UI enable/disable state)
     *
     * @returns {boolean}
     */
    isWebAnalyticsConfigured() {
        // Correct config is required
        if (!this._isValidTinybirdConfig()) {
            return false;
        }

        // Ghost (Pro) limits
        if (this.limitService.isDisabled('limitAnalytics')) {
            debug('Web analytics configuration is not available for Ghost (Pro) sites without a custom domain, or hosted on a subdirectory');
            return false;
        }

        return true;
    }

    // PRIVATE

    /**
     * Validates tinybird configuration for web analytics
     * @returns {boolean} True if config is valid, false otherwise
     * @private
     */
    _isValidTinybirdConfig() {
        const tinybirdConfig = this.config.get('tinybird');

        // First requirement: tinybird:tracker:endpoint is always required
        if (!tinybirdConfig || !tinybirdConfig.tracker?.endpoint) {
            debug('Web analytics is not available without tinybird:tracker:endpoint');
            return false;
        }

        // Second requirement: Either JWT config OR local stats config
        const hasJwtConfig = !!(tinybirdConfig.workspaceId && tinybirdConfig.adminToken);
        const hasLocalConfig = !!(tinybirdConfig.stats?.local?.enabled);

        if (!hasJwtConfig && !hasLocalConfig) {
            debug('Web analytics requires either (workspaceId + adminToken) or stats.local.enabled');
            return false;
        }

        return true;
    }

    #managedEmailEnabled() {
        return !!this.config.get('hostSettings:managedEmail:enabled');
    }

    #managedSendingDomain() {
        return this.config.get('hostSettings:managedEmail:sendingDomain');
    }
}

module.exports = SettingsHelpers;
