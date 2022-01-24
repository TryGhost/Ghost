const _ = require('lodash');
const StripeService = require('@tryghost/members-stripe-service');
const logging = require('@tryghost/logging');
const membersService = require('../members');
const config = require('../../../shared/config');
const settings = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const events = require('../../lib/common/events');
const models = require('../../models');
const {getConfig} = require('./config');

async function configureApi() {
    const cfg = getConfig(settings, config, urlUtils);
    if (cfg) {
        await module.exports.configure(cfg);
        return true;
    }
    return false;
}

const debouncedConfigureApi = _.debounce(() => {
    configureApi();
}, 600);

module.exports = new StripeService({
    membersService,
    models: _.pick(models, ['Product', 'StripePrice', 'StripeCustomerSubscription', 'StripeProduct', 'MemberStripeCustomer', 'Offer', 'Settings']),
    StripeWebhook: {
        async get() {
            return {
                webhook_id: settings.get('members_stripe_webhook_id'),
                secret: settings.get('members_stripe_webhook_secret')
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
    }
});

module.exports.init = async function init() {
    try {
        await configureApi();
    } catch (err) {
        logging.error(err);
    }
    events.on('settings.edited', function (model) {
        if (['stripe_publishable_key', 'stripe_secret_key', 'stripe_connect_publishable_key', 'stripe_connect_secret_key'].includes(model.get('key'))) {
            debouncedConfigureApi();
        }
    });
};
