const _ = require('lodash');
const logging = require('@tryghost/logging');
const StripeAPIService = require('@tryghost/members-stripe-service');

const config = require('../../../shared/config');
const settings = require('../../../shared/settings-cache');
const events = require('../../lib/common/events');

const {getConfig} = require('./config');

const api = new StripeAPIService({
    logger: logging,
    config: {}
});

const stripeKeySettings = [
    'stripe_publishable_key',
    'stripe_secret_key',
    'stripe_connect_publishable_key',
    'stripe_connect_secret_key'
];

function configureApi() {
    const cfg = getConfig(settings, config);
    if (cfg) {
        api.configure(cfg);
    }
}

const debouncedConfigureApi = _.debounce(configureApi, 600);

module.exports = {
    async init() {
        configureApi();
        events.on('settings.edited', function (model) {
            if (!stripeKeySettings.includes(model.get('key'))) {
                return;
            }
            debouncedConfigureApi();
        });
    },

    api
};
