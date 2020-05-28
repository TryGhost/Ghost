const logging = require('../../../../../shared/logging');
const debug = require('ghost-ignition').debug('migrations');

module.exports.config = {
    transaction: true
};

module.exports.up = (options) => {
    const settingsKey = 'members_subscription_settings';

    return options
        .transacting('settings')
        .where('key', settingsKey)
        .select('value')
        .first()
        .then((subscriptionSettingsEntry) => {
            debug(subscriptionSettingsEntry);
            if (!subscriptionSettingsEntry) {
                logging.warn(`Cannot find ${settingsKey} settings.`);
                return;
            }

            let subscriptionSettings = JSON.parse(subscriptionSettingsEntry.value);

            debug('before cleanup');
            debug(JSON.stringify(subscriptionSettings, null, 2));

            const hasIsPaid = Object.prototype.hasOwnProperty.call(subscriptionSettings, 'isPaid');

            if (hasIsPaid) {
                debug('Removing legacy isPaid flag from members settings');
                delete subscriptionSettings.isPaid;

                debug('after cleanup');
                debug(JSON.stringify(subscriptionSettings, null, 2));

                return options
                    .transacting('settings')
                    .where('key', settingsKey)
                    .update({
                        value: JSON.stringify(subscriptionSettings)
                    });
            }
        });
};

module.exports.down = (options) => {
    const settingsKey = 'members_subscription_settings';

    return options
        .transacting('settings')
        .where('key', settingsKey)
        .select('value')
        .first()
        .then((subscriptionSettingsEntry) => {
            debug(subscriptionSettingsEntry);
            if (!subscriptionSettingsEntry) {
                logging.warn(`Cannot find ${settingsKey} settings.`);
                return;
            }

            let subscriptionSettings = JSON.parse(subscriptionSettingsEntry.value);

            debug('before cleanup');
            debug(JSON.stringify(subscriptionSettings, null, 2));

            let isPaid = false;

            const stripePaymentProcessor = subscriptionSettings.paymentProcessors.find(
                paymentProcessor => paymentProcessor.adapter === 'stripe'
            );

            if (stripePaymentProcessor && stripePaymentProcessor.config.public_token && stripePaymentProcessor.config.secret_token) {
                isPaid = true;
            }

            subscriptionSettings.isPaid = isPaid;

            debug('after cleanup');
            debug(JSON.stringify(subscriptionSettings, null, 2));

            return options
                .transacting('settings')
                .where('key', settingsKey)
                .update({
                    value: JSON.stringify(subscriptionSettings)
                });
        });
};

module.exports.config = {
    transaction: true
};
