const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'paywall_email_heading',
        value: null,
        type: 'string',
        group: 'members'
    }),
    addSetting({
        key: 'paywall_email_description',
        value: null,
        type: 'string',
        group: 'members'
    })
);
