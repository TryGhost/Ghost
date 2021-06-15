const _ = require('lodash');
const Promise = require('bluebird');
const logging = require('@tryghost/logging');

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
                logging.warn('Cannot find settings.');
                return;
            }
            let subscriptionSettingsEntry = response.find((entry) => {
                return entry.key === settingsKey;
            });

            if (!subscriptionSettingsEntry) {
                logging.warn('Cannot find members subscription settings.');
                return;
            }
            let subscriptionSettings = JSON.parse(subscriptionSettingsEntry.value);

            let hasRequirePaymentProperty = Object.prototype.hasOwnProperty.call(subscriptionSettings, 'requirePaymentForSignup');
            let hasSelfSignupProperty = Object.prototype.hasOwnProperty.call(subscriptionSettings, 'allowSelfSignup');
            let hasFromAddressProperty = Object.prototype.hasOwnProperty.call(subscriptionSettings, 'fromAddress');

            if (!hasFromAddressProperty) {
                subscriptionSettings.fromAddress = 'noreply';
            }

            if (!hasRequirePaymentProperty && !hasSelfSignupProperty) {
                subscriptionSettings.allowSelfSignup = true;
            }
            
            if (hasRequirePaymentProperty) {
                if (!hasSelfSignupProperty) {
                    logging.info(`Adding allowSelfSignup property from requirePaymentForSignup in member settings`);
                    subscriptionSettings.allowSelfSignup = !subscriptionSettings.requirePaymentForSignup;
                }
                logging.info(`Removing requirePaymentForSignup property in member settings`);
                delete subscriptionSettings.requirePaymentForSignup;
            }

            return localOptions
                .transacting('settings')
                .where('key', settingsKey)
                .update({
                    value: JSON.stringify(subscriptionSettings)
                });
        });
};

// `up` only runs in order to normalize member subscription settings which was added
// no need for down migration as its non-breaking up migration for future versions only
module.exports.down = () => Promise.resolve();

module.exports.config = {
    transaction: true
};
