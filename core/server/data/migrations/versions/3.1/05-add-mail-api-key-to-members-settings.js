const _ = require('lodash');
const Promise = require('bluebird');
const common = require('../../../../lib/common');

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

            let hasMailgunApiKeyProperty = Object.prototype.hasOwnProperty.call(subscriptionSettings, 'mailgunApiKey');

            if (!hasMailgunApiKeyProperty) {
                subscriptionSettings.mailgunApiKey = '';
                common.logging.info('Adding mail provider API key to members settings');
            } else {
                common.logging.warn('Mail provider API key setting already exists in members settings.');
            }

            return localOptions
                .transacting('settings')
                .where('key', settingsKey)
                .update({
                    value: JSON.stringify(subscriptionSettings)
                });
        });
};

// `up` only runs in order to normalize new member subscription settings which was added
// no need for down migration as its non-breaking up migration for future versions only
module.exports.down = () => Promise.resolve();

module.exports.config = {
    transaction: true
};
