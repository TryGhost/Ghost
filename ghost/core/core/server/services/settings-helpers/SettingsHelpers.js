const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const {EmailAddressParser} = require('@tryghost/email-addresses');
const logging = require('@tryghost/logging');
const crypto = require('crypto');

const messages = {
    incorrectKeyType: 'type must be one of "direct" or "connect".'
};

class SettingsHelpers {
    constructor({settingsCache, urlUtils, config, labs}) {
        this.settingsCache = settingsCache;
        this.urlUtils = urlUtils;
        this.config = config;
        this.labs = labs;
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
        return this.isStripeConnected();
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

    // PRIVATE

    #managedEmailEnabled() {
        return !!this.config.get('hostSettings:managedEmail:enabled');
    }

    #managedSendingDomain() {
        return this.config.get('hostSettings:managedEmail:sendingDomain');
    }
}

module.exports = SettingsHelpers;
