const _ = require('lodash');
const Promise = require('bluebird');
const common = require('../../../../lib/common');
const settingsCache = require('../../../../services/settings/cache');
const debug = require('ghost-ignition').debug('migrations');

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    let localOptions = _.merge({
        context: {internal: true}
    }, options);
    const settingsKey = 'members_subscription_settings';

    return localOptions
        .transacting('settings')
        .then((response) => {
            if (!response) {
                common.logging.warn('Cannot find settings.');
                return;
            }

            let subscriptionSettingsEntry = response.find((entry) => {
                return entry.key === settingsKey;
            });

            if (!subscriptionSettingsEntry) {
                common.logging.warn('Cannot find members subscription settings.');
                return;
            }

            let subscriptionSettings = JSON.parse(subscriptionSettingsEntry.value);

            debug('before cleanup');
            debug(JSON.stringify(subscriptionSettings, null, 2));

            const stripePaymentProcessor = subscriptionSettings.paymentProcessors.find(
                paymentProcessor => paymentProcessor.adapter === 'stripe'
            );

            // Remove "broken" complimentary plans that were introduced with 3.10.0, they didn't have
            // interval property defined unlike regular plans
            if (stripePaymentProcessor && stripePaymentProcessor.config.public_token && stripePaymentProcessor.config.secret_token) {
                stripePaymentProcessor.config.plans = stripePaymentProcessor.config.plans.filter((plan) => {
                    return plan.interval !== undefined;
                });

                const complimentaryPlan = stripePaymentProcessor.config.plans.find(plan => (plan.name === 'Complimentary' && plan.currency === stripePaymentProcessor.config.currency));

                if (!complimentaryPlan && stripePaymentProcessor.config.currency) {
                    const complimentaryInCurrentCurrency = {
                        name: 'Complimentary',
                        currency: stripePaymentProcessor.config.currency,
                        interval: 'year',
                        amount: '0'
                    };

                    debug('no complimentary plan found in plans');
                    debug(JSON.stringify(stripePaymentProcessor.config.plans, null, 2));

                    debug('inserting complimentary plan');
                    debug(JSON.stringify(complimentaryInCurrentCurrency, null, 2));

                    stripePaymentProcessor.config.plans.push(complimentaryInCurrentCurrency);
                }
            }

            debug('after cleanup');
            debug(JSON.stringify(subscriptionSettings, null, 2));

            return localOptions
                .transacting('settings')
                .where('key', settingsKey)
                .update({
                    value: JSON.stringify(subscriptionSettings)
                })
                .then(() => {
                    const settingModel = Object.assign({}, subscriptionSettingsEntry, {value: JSON.stringify(subscriptionSettings)});
                    settingsCache.set(settingsKey, settingModel);

                    // need to make sure members-api gets reinitialized below is a hacky way to trigger it as we don't use model's in migration
                    const settingsModelImitation = {
                        get() {
                            return settingsKey;
                        }
                    };

                    common.events.emit('settings.edited', settingsModelImitation);
                });
        });
};

// `up` is only run to fix a problem that is introduced with 3.10.0,
// it doesn't make sense to "reintroduced" broken state with down migration
module.exports.down = () => Promise.resolve();

module.exports.config = {
    transaction: true
};
