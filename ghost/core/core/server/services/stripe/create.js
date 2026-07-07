const _ = require('lodash');
const logging = require('@tryghost/logging');
const StripeService = require('./stripe-service');
const {getConfig} = require('./config');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.settingsCache
 * @param {object} deps.settingsHelpers
 * @param {object} deps.urlUtils
 * @param {object} deps.events
 * @param {object} deps.donations
 * @param {object} deps.gifts
 * @param {object} deps.staff
 * @param {{get: (key: string) => unknown}} deps.deploymentConfig
 * @param {() => boolean} deps.isTestEnv
 * @param {object} deps.labs
 * @param {object} deps.membersService
 */
module.exports = function createStripeService({models, settingsCache, settingsHelpers, urlUtils, events, donations, gifts, staff, deploymentConfig, isTestEnv, labs, membersService}) {
    const service = new StripeService({
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
                return {
                    webhook_id: settingsCache.get('members_stripe_webhook_id'),
                    secret: settingsCache.get('members_stripe_webhook_secret')
                };
            },
            async save(data) {
                await models.Settings.edit([{
                    key: 'members_stripe_webhook_id',
                    value: data.webhook_id
                }, {
                    key: 'members_stripe_webhook_secret',
                    value: data.secret
                }]);
            }
        },
        donationService: donations,
        giftService: gifts,
        staffService: staff,
        settingsCache
    });

    async function configureApi() {
        const cfg = getConfig({settingsHelpers, config: deploymentConfig, urlUtils});
        if (cfg) {
            cfg.testEnv = isTestEnv();
            await service.configure(cfg);
            return true;
        }
        return false;
    }

    const debouncedConfigureApi = _.debounce(() => {
        configureApi().catch((err) => {
            logging.error(err);
        });
    }, 600);

    function stripeSettingsChanged(model) {
        if (['stripe_publishable_key', 'stripe_secret_key', 'stripe_connect_publishable_key', 'stripe_connect_secret_key'].includes(model.get('key'))) {
            debouncedConfigureApi();
        }
    }

    service.init = async function init() {
        try {
            await configureApi();
        } catch (err) {
            logging.error(err);
        }

        events
            .removeListener('settings.edited', stripeSettingsChanged)
            .on('settings.edited', stripeSettingsChanged);
    };

    return service;
};
