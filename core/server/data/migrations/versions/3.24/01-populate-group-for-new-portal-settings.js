const Promise = require('bluebird');
const logging = require('../../../../../shared/logging');

// new setting keys and group mapping
const groupMapping = [{
    group: 'portal',
    keys: [
        'portal_button_style',
        'portal_button_icon',
        'portal_button_signup_text'
    ]
}];

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        // set the correct group value for new settings
        await Promise.map(groupMapping, async (groupMap) => {
            return await Promise.map(groupMap.keys, async (key) => {
                logging.info(`Updating setting ${key} to group ${groupMap.group}`);

                return await options
                    .transacting('settings')
                    .where('key', key)
                    .update({
                        group: groupMap.group
                    });
            });
        });
    },

    // `up` is only run to update correct group value for each setting instead of default.
    // it doesn't make sense to be revert a setting's group to default `core` again
    async down() {}
};
