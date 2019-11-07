const {URL} = require('url');
const settingsCache = require('../settings/cache');
const ghostVersion = require('../../lib/ghost-version');
const crypto = require('crypto');
const common = require('../../lib/common');
const urlUtils = require('../../lib/url-utils');

// NOTE: the function is an exact duplicate of one in GhostMailer should be extracted
//       into a common lib once it needs to be reused anywhere else again
function getDomain() {
    const domain = urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
    return domain && domain[1];
}

function getEmailFromAddress() {
    const subscriptionSettings = settingsCache.get('members_subscription_settings') || {};

    return `${subscriptionSettings.fromAddress || 'noreply'}@${getDomain()}`;
}

const getApiUrl = ({version, type}) => {
    const {href} = new URL(
        urlUtils.getApiPath({version, type}),
        urlUtils.urlFor('admin', true)
    );
    return href;
};

const siteUrl = urlUtils.getSiteUrl();
const membersApiUrl = getApiUrl({version: 'v3', type: 'members'});

function getStripePaymentConfig() {
    const subscriptionSettings = settingsCache.get('members_subscription_settings');

    const stripePaymentProcessor = subscriptionSettings.paymentProcessors.find(
        paymentProcessor => paymentProcessor.adapter === 'stripe'
    );

    if (!stripePaymentProcessor || !stripePaymentProcessor.config) {
        return null;
    }

    if (!stripePaymentProcessor.config.public_token || !stripePaymentProcessor.config.secret_token) {
        return null;
    }

    const webhookHandlerUrl = new URL('/members/webhooks/stripe', siteUrl);

    const checkoutSuccessUrl = new URL(siteUrl);
    checkoutSuccessUrl.searchParams.set('stripe', 'success');
    const checkoutCancelUrl = new URL(siteUrl);
    checkoutCancelUrl.searchParams.set('stripe', 'cancel');

    return {
        publicKey: stripePaymentProcessor.config.public_token,
        secretKey: stripePaymentProcessor.config.secret_token,
        checkoutSuccessUrl: checkoutSuccessUrl.href,
        checkoutCancelUrl: checkoutCancelUrl.href,
        webhookHandlerUrl: webhookHandlerUrl.href,
        product: stripePaymentProcessor.config.product,
        plans: stripePaymentProcessor.config.plans,
        appInfo: {
            name: 'Ghost',
            partner_id: 'pp_partner_DKmRVtTs4j9pwZ',
            version: ghostVersion.original,
            url: 'https://ghost.org/'
        }
    };
}

function getAuthSecret() {
    const hexSecret = settingsCache.get('members_email_auth_secret');
    if (!hexSecret) {
        common.logging.warn('Could not find members_email_auth_secret, using dynamically generated secret');
        return crypto.randomBytes(64);
    }
    const secret = Buffer.from(hexSecret, 'hex');
    if (secret.length < 64) {
        common.logging.warn('members_email_auth_secret not large enough (64 bytes), using dynamically generated secret');
        return crypto.randomBytes(64);
    }
    return secret;
}

function getAllowSelfSignup() {
    const subscriptionSettings = settingsCache.get('members_subscription_settings');
    return subscriptionSettings.allowSelfSignup;
}

function getTokenConfig() {
    return {
        issuer: membersApiUrl,
        publicKey: settingsCache.get('members_public_key'),
        privateKey: settingsCache.get('members_private_key')
    };
}

function getSigninURL(token, type) {
    const signinURL = new URL(siteUrl);
    signinURL.searchParams.set('token', token);
    signinURL.searchParams.set('action', type);
    return signinURL.href;
}

module.exports = {
    getEmailFromAddress,
    getStripePaymentConfig,
    getAllowSelfSignup,
    getAuthSecret,
    getTokenConfig,
    getSigninURL
};
