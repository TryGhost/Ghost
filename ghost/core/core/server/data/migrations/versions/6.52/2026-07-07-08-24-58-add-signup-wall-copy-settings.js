const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'paywall_signup_description',
        value: null,
        type: 'string',
        group: 'members'
    }),
    addSetting({
        key: 'paywall_signup_button_text',
        value: null,
        type: 'string',
        group: 'members'
    })
);
