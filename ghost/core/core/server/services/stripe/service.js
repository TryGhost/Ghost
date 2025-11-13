const _ = require('lodash');
const StripeService = require('./StripeService');
const logging = require('@tryghost/logging');
const membersService = require('../members');
const config = require('../../../shared/config');
const settings = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const events = require('../../lib/common/events');
const models = require('../../models');
const {getConfig} = require('./config');
const settingsHelpers = require('../settings-helpers');
const donationService = require('../donations');
const staffService = require('../staff');
const labs = require('../../../shared/labs');

async function configureApi() {
    logging.info('[Stripe Webhook] configureApi() called');
    const cfg = getConfig({settingsHelpers, config, urlUtils});
    if (cfg) {
        logging.info(`[Stripe Webhook] configureApi() - config retrieved, configuring Stripe - has_secretKey: ${!!cfg.secretKey}, has_publicKey: ${!!cfg.publicKey}, has_webhookSecret: ${!!cfg.webhookSecret}, webhookHandlerUrl: ${cfg.webhookHandlerUrl || 'null'}`);
        // @NOTE: to not start test mode when running playwright suite
        cfg.testEnv = process.env.NODE_ENV.startsWith('test') && process.env.NODE_ENV !== 'testing-browser';
        await module.exports.configure(cfg);
        logging.info('[Stripe Webhook] configureApi() - Stripe configured successfully');
        return true;
    } else {
        logging.info('[Stripe Webhook] configureApi() - no config available (Stripe not configured)');
    }
    return false;
}

const debouncedConfigureApi = _.debounce(() => {
    configureApi().catch((err) => {
        logging.error(err);
    });
}, 600);

module.exports = new StripeService({
    labs,
    membersService,
    models: _.pick(models, [
        'Product',
        'StripePrice',
        'StripeCustomerSubscription',
        'StripeProduct',
        'MemberStripeCustomer',
        'Offer',
        'Settings'
    ]),
    StripeWebhook: {
        async get() {
            const webhook_id = settings.get('members_stripe_webhook_id');
            const secret = settings.get('members_stripe_webhook_secret');
            logging.info(`[Stripe Webhook] StripeWebhook.get() called - webhook_id: ${webhook_id || 'null'}, has_secret: ${!!secret}`);
            return {
                webhook_id,
                secret
            };
        },
        async save(data) {
            const setting_to_null = data.webhook_id === null || data.secret === null;
            logging.info(`[Stripe Webhook] StripeWebhook.save() called - webhook_id: ${data.webhook_id || 'null'}, has_secret: ${!!data.secret}, setting_to_null: ${setting_to_null}`);
            await models.Settings.edit([{
                key: 'members_stripe_webhook_id',
                value: data.webhook_id
            }, {
                key: 'members_stripe_webhook_secret',
                value: data.secret
            }]);
            logging.info(`[Stripe Webhook] StripeWebhook.save() - settings saved - webhook_id: ${data.webhook_id || 'null'}, has_secret: ${!!data.secret}`);
        }
    },
    donationService,
    staffService
});

function stripeSettingsChanged(model) {
    if (['stripe_publishable_key', 'stripe_secret_key', 'stripe_connect_publishable_key', 'stripe_connect_secret_key'].includes(model.get('key'))) {
        debouncedConfigureApi();
    }
}

module.exports.init = async function init() {
    try {
        await configureApi();
    } catch (err) {
        logging.error(err);
    }

    events
        .removeListener('settings.edited', stripeSettingsChanged)
        .on('settings.edited', stripeSettingsChanged);
};
