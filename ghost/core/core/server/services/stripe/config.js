const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');
const labs = require('../../../shared/labs');

const messages = {
  remoteWebhooksInDevelopment:
    'Cannot use remote webhooks in development. See https://docs.ghost.org/webhooks/#stripe-webhooks for developing with Stripe.',
};

// @TODO Refactor to a class w/ constructor

/**
 * @typedef {object} StripeURLConfig
 * @prop {string} checkoutSessionSuccessUrl
 * @prop {string} checkoutSessionCancelUrl
 * @prop {string} checkoutSetupSessionSuccessUrl
 * @prop {string} checkoutSetupSessionCancelUrl
 * @prop {string} billingPortalReturnUrl
 */

module.exports = {
  getConfig({ config, urlUtils, settingsHelpers }) {
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

      const billingPortalReturnUrl = new URL(siteUrl);
      billingPortalReturnUrl.searchParams.set('stripe', 'return');

      return {
        checkoutSessionSuccessUrl: checkoutSuccessUrl.href,
        checkoutSessionCancelUrl: checkoutCancelUrl.href,
        checkoutSetupSessionSuccessUrl: billingSuccessUrl.href,
        checkoutSetupSessionCancelUrl: billingCancelUrl.href,
        billingPortalReturnUrl: billingPortalReturnUrl.href,
      };
    }

    function parseIgnoreCustomerList(value) {
      if (!Array.isArray(value)) {
        return [];
      }

      return value.map((customerId) => String(customerId).trim()).filter(Boolean);
    }

    const keys = settingsHelpers.getActiveStripeKeys();
    if (!keys) {
      return null;
    }

    const env = config.get('env');
    const remoteWebhooks = env !== 'production' && config.get('stripeRemoteWebhooks') === true;
    let webhookSecret = remoteWebhooks ? undefined : process.env.WEBHOOK_SECRET;

    if (env !== 'production' && !remoteWebhooks && !webhookSecret) {
      webhookSecret = 'DEFAULT_WEBHOOK_SECRET';
      logging.warn(tpl(messages.remoteWebhooksInDevelopment));
    }

    // Development can tunnel the webhook URL alone while the site stays on localhost.
    const webhookHandlerUrl = new URL(
      config.get('stripeWebhookUrl') || 'members/webhooks/stripe/',
      urlUtils.getSiteUrl(),
    );
    const webhookCustomerIgnoreList = parseIgnoreCustomerList(
      config.get('stripeWebhookCustomerIgnoreList'),
    );

    const urls = getStripeUrlConfig();
    const siteUrl = urlUtils.getSiteUrl();

    return {
      ...keys,
      ...urls,
      enablePromoCodes: config.get('enableStripePromoCodes'),
      get enableAutomaticTax() {
        return labs.isSet('stripeAutomaticTax');
      },
      webhookSecret: webhookSecret,
      webhookHandlerUrl: webhookHandlerUrl.href,
      // A development registration points at a tunnel that closes with the process,
      // so it is removed on shutdown rather than kept for the next boot.
      ephemeralWebhook: remoteWebhooks,
      webhookCustomerIgnoreList,
      siteUrl,
    };
  },
};
