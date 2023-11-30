const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const {EmailAddressParser} = require('@tryghost/email-addresses');
const logging = require('@tryghost/logging');

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

    /**
     * NOTE! The backend still allows to self signup if this returns false because a site might use built-in free signup forms apart from Portal
     */
    allowSelfSignup() {
        return this.settingsCache.get('members_signup_access') === 'all' && (this.settingsCache.get('portal_plans').includes('free') || !this.arePaidMembersEnabled());
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

    getMembersSupportAddress() {
        let supportAddress = this.settingsCache.get('members_support_address');

        if (!supportAddress && this.useNewEmailAddresses()) {
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
        if (this.useNewEmailAddresses()) {
            // parse the email here and remove the sender name
            // E.g. when set to "bar" <from@default.com>
            const configAddress = this.config.get('mail:from');
            const parsed = EmailAddressParser.parse(configAddress);
            if (parsed) {
                return parsed;
            }

            // For missing configs, we default to the old flow
            logging.warn('Missing mail.from config, falling back to a generated email address. Please update your config file and set a valid from address');
        }
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

    useNewEmailAddresses() {
        return this.#managedEmailEnabled() || this.labs.isSet('newEmailAddresses');
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
