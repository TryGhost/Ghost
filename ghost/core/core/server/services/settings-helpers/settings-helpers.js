const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    incorrectKeyType: 'type must be one of "direct" or "connect".'
};

class SettingsHelpers {
    constructor({settingsCache, urlUtils, config}) {
        this.settingsCache = settingsCache;
        this.urlUtils = urlUtils;
        this.config = config;
    }

    isMembersEnabled() {
        return this.settingsCache.get('members_signup_access') !== 'none';
    }

    isMembersInviteOnly() {
        return this.settingsCache.get('members_signup_access') === 'invite';
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

    getDefaultEmailDomain() {
        const url = this.urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
        const domain = (url && url[1]) || '';
        if (domain.startsWith('www.')) {
            return domain.substring('www.'.length);
        }
        return domain;
    }

    getMembersSupportAddress() {
        const supportAddress = this.settingsCache.get('members_support_address') || 'noreply';

        // Any fromAddress without domain uses site domain, like default setting `noreply`
        if (supportAddress.indexOf('@') < 0) {
            return `${supportAddress}@${this.getDefaultEmailDomain()}`;
        }
        return supportAddress;
    }

    getNoReplyAddress() {
        return `noreply@${this.getDefaultEmailDomain()}`;
    }
}

module.exports = SettingsHelpers;
