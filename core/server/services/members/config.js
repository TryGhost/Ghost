const {URL} = require('url');
const crypto = require('crypto');
const path = require('path');

const COMPLIMENTARY_PLAN = {
    name: 'Complimentary',
    currency: 'usd',
    interval: 'year',
    amount: '0'
};

class MembersConfigProvider {
    /**
     * @param {object} options
     * @param {{get: (key: string) => any}} options.settingsCache
     * @param {{get: (key: string) => any}} options.config
     * @param {any} options.urlUtils
     * @param {any} options.logging
     * @param {{original: string}} options.ghostVersion
     */
    constructor(options) {
        this._settingsCache = options.settingsCache;
        this._config = options.config;
        this._urlUtils = options.urlUtils;
        this._logging = options.logging;
        this._ghostVersion = options.ghostVersion;
    }

    /**
     * @private
     */
    _getDomain() {
        const domain = this._urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
        return domain && domain[1];
    }

    /**
     */
    getEmailFromAddress() {
        const subscriptionSettings = this._settingsCache.get('members_subscription_settings') || {};
        const fromAddress = subscriptionSettings.fromAddress || 'noreply';

        // Any fromAddress without domain uses site domain, like default setting `noreply`
        if (fromAddress.indexOf('@') < 0) {
            return `${fromAddress}@${this._getDomain()}`;
        }
        return fromAddress;
    }

    getPublicPlans() {
        const CURRENCY_SYMBOLS = {
            USD: '$',
            AUD: '$',
            CAD: '$',
            GBP: '£',
            EUR: '€',
            INR: '₹'
        };
        const defaultPriceData = {
            monthly: 0,
            yearly: 0
        };

        try {
            const membersSettings = this._settingsCache.get('members_subscription_settings');
            const stripeProcessor = membersSettings.paymentProcessors.find(
                processor => processor.adapter === 'stripe'
            );

            const priceData = stripeProcessor.config.plans.reduce((prices, plan) => {
                const numberAmount = 0 + plan.amount;
                const dollarAmount = numberAmount ? Math.round(numberAmount / 100) : 0;
                return Object.assign(prices, {
                    [plan.name.toLowerCase()]: dollarAmount
                });
            }, {});

            priceData.currency = String.prototype.toUpperCase.call(stripeProcessor.config.currency || 'usd');
            priceData.currency_symbol = CURRENCY_SYMBOLS[priceData.currency];

            if (Number.isInteger(priceData.monthly) && Number.isInteger(priceData.yearly)) {
                return priceData;
            }

            return defaultPriceData;
        } catch (err) {
            return defaultPriceData;
        }
    }

    /**
     * @function getStripeAPIKeys
     * @desc Gets the stripe api keys from settings, respecting the stripeDirect config
     *
     * @param {string} publicKey - The publicKey to use if stripeDirect is enabled
     * @param {string} secretKey - The secretKey to use if stripeDirect is enabled
     *
     * @returns {{publicKey: string, secretKey: string}}
     */
    getStripeAPIKeys(publicKey, secretKey) {
        const stripeDirect = this._config.get('stripeDirect');
        const stripeConnectIntegration = this._settingsCache.get('stripe_connect_integration');
        const hasStripeConnectKeys = stripeConnectIntegration.secret_key && stripeConnectIntegration.public_key;

        if (stripeDirect || !hasStripeConnectKeys) {
            return {
                publicKey,
                secretKey
            };
        }

        return {
            publicKey: stripeConnectIntegration.public_key,
            secretKey: stripeConnectIntegration.secret_key
        };
    }

    isStripeConnected() {
        const paymentConfig = this.getStripePaymentConfig();

        return (paymentConfig && paymentConfig.publicKey && paymentConfig.secretKey);
    }

    getStripePaymentConfig() {
        const subscriptionSettings = this._settingsCache.get('members_subscription_settings');

        const stripePaymentProcessor = subscriptionSettings.paymentProcessors.find(
            paymentProcessor => paymentProcessor.adapter === 'stripe'
        );

        if (!stripePaymentProcessor || !stripePaymentProcessor.config) {
            return null;
        }

        // NOTE: "Complimentary" plan has to be first in the queue so it is created even if regular plans are not configured
        stripePaymentProcessor.config.plans.unshift(COMPLIMENTARY_PLAN);

        const siteUrl = this._urlUtils.getSiteUrl();

        const webhookHandlerUrl = new URL('/members/webhooks/stripe', siteUrl);

        const checkoutSuccessUrl = new URL(siteUrl);
        checkoutSuccessUrl.searchParams.set('stripe', 'success');
        const checkoutCancelUrl = new URL(siteUrl);
        checkoutCancelUrl.searchParams.set('stripe', 'cancel');

        const billingSuccessUrl = new URL(siteUrl);
        billingSuccessUrl.searchParams.set('stripe', 'billing-update-success');
        const billingCancelUrl = new URL(siteUrl);
        billingCancelUrl.searchParams.set('stripe', 'billing-update-cancel');

        const stripeApiKeys = this.getStripeAPIKeys(
            stripePaymentProcessor.config.public_token,
            stripePaymentProcessor.config.secret_token
        );

        if (!stripeApiKeys.publicKey || !stripeApiKeys.secretKey) {
            return null;
        }

        return {
            publicKey: stripeApiKeys.publicKey,
            secretKey: stripeApiKeys.secretKey,
            checkoutSuccessUrl: checkoutSuccessUrl.href,
            checkoutCancelUrl: checkoutCancelUrl.href,
            billingSuccessUrl: billingSuccessUrl.href,
            billingCancelUrl: billingCancelUrl.href,
            webhookHandlerUrl: webhookHandlerUrl.href,
            product: stripePaymentProcessor.config.product,
            plans: stripePaymentProcessor.config.plans,
            appInfo: {
                name: 'Ghost',
                partner_id: 'pp_partner_DKmRVtTs4j9pwZ',
                version: this._ghostVersion.original,
                url: 'https://ghost.org/'
            }
        };
    }

    getAuthSecret() {
        const hexSecret = this._settingsCache.get('members_email_auth_secret');
        if (!hexSecret) {
            this._logging.warn('Could not find members_email_auth_secret, using dynamically generated secret');
            return crypto.randomBytes(64);
        }
        const secret = Buffer.from(hexSecret, 'hex');
        if (secret.length < 64) {
            this._logging.warn('members_email_auth_secret not large enough (64 bytes), using dynamically generated secret');
            return crypto.randomBytes(64);
        }
        return secret;
    }

    getAllowSelfSignup() {
        const subscriptionSettings = this._settingsCache.get('members_subscription_settings');
        return subscriptionSettings.allowSelfSignup;
    }

    getTokenConfig() {
        const {href: membersApiUrl} = new URL(
            this._urlUtils.getApiPath({version: 'v3', type: 'members'}),
            this._urlUtils.urlFor('admin', true)
        );

        return {
            issuer: membersApiUrl,
            publicKey: this._settingsCache.get('members_public_key'),
            privateKey: this._settingsCache.get('members_private_key')
        };
    }

    getSigninURL(token, type) {
        const siteUrl = this._urlUtils.getSiteUrl();
        const signinURL = new URL(siteUrl);
        signinURL.pathname = path.join(signinURL.pathname, '/members/');
        signinURL.searchParams.set('token', token);
        signinURL.searchParams.set('action', type);
        return signinURL.href;
    }
}

module.exports = MembersConfigProvider;
