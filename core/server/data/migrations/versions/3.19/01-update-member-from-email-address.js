const logging = require('../../../../../shared/logging');
const urlUtils = require('../../../../../shared/url-utils');
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

            const hasFromAddress = Object.prototype.hasOwnProperty.call(subscriptionSettings, 'fromAddress');
            const domain = urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
            const blogDomain = domain && domain[1];
            if (hasFromAddress && blogDomain) {
                logging.info(`Updating fromAddress in members settings with domain ${blogDomain}`);

                subscriptionSettings.fromAddress = `${subscriptionSettings.fromAddress}@${blogDomain}`;

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

            const hasFromAddress = Object.prototype.hasOwnProperty.call(subscriptionSettings, 'fromAddress');

            if (hasFromAddress) {
                logging.info('Removing domain in fromAddress in members settings');
                subscriptionSettings.fromAddress = subscriptionSettings.fromAddress.split('@')[0];

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

module.exports.config = {
    transaction: true
};
