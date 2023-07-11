const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const labs = require('../../../shared/labs');

const messages = {
    remoteWebhooksInDevelopment: 'Cannot use remote webhooks in development. See https://ghost.org/docs/webhooks/#stripe-webhooks for developing with Stripe.'
};

// @TODO Refactor to a class w/ constructor

/**
 * @typedef {object} StripeURLConfig
 * @prop {string} checkoutSessionSuccessUrl
 * @prop {string} checkoutSessionCancelUrl
 * @prop {string} checkoutSetupSessionSuccessUrl
 * @prop {string} checkoutSetupSessionCancelUrl
 */

module.exports = {
    getConfig({config, urlUtils, settingsHelpers}) {
        /**
         * @returns {StripeURLConfig}
         */
        function getStripeUrlConfig() {
            const siteUrl = urlUtils.getSiteUrl();

            const checkoutSuccessUrl = new URL(siteUrl);
            checkoutSuccessUrl.searchParams.set('stripe', 'success');
            const checkoutCancelUrl = new URL(siteUrl);
            checkoutCancelUrl.searchParams.set('stripe', 'cancel');

            const billingSuccessUrl = new URL(siteUrl);
            billingSuccessUrl.searchParams.set('stripe', 'billing-update-success');
            const billingCancelUrl = new URL(siteUrl);
            billingCancelUrl.searchParams.set('stripe', 'billing-update-cancel');

            return {
                checkoutSessionSuccessUrl: checkoutSuccessUrl.href,
                checkoutSessionCancelUrl: checkoutCancelUrl.href,
                checkoutSetupSessionSuccessUrl: billingSuccessUrl.href,
                checkoutSetupSessionCancelUrl: billingCancelUrl.href
            };
        }

        const keys = settingsHelpers.getActiveStripeKeys();
        if (!keys) {
            return null;
        }

        const env = config.get('env');
        let webhookSecret = process.env.WEBHOOK_SECRET;

        if (env !== 'production') {
            if (!webhookSecret) {
                webhookSecret = 'DEFAULT_WEBHOOK_SECRET';
                logging.warn(tpl(messages.remoteWebhooksInDevelopment));
            }
        }

        const webhookHandlerUrl = new URL('members/webhooks/stripe/', urlUtils.getSiteUrl());

        const urls = getStripeUrlConfig();

        return {
            ...keys,
            ...urls,
            enablePromoCodes: config.get('enableStripePromoCodes'),
            get enableAutomaticTax() {
                return labs.isSet('stripeAutomaticTax');
            },
            webhookSecret: webhookSecret,
            webhookHandlerUrl: webhookHandlerUrl.href
        };
    }
};
