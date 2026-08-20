const {addSetting, combineTransactionalMigrations} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'portal_signup_gift_promotion',
        value: 'true',
        type: 'boolean',
        group: 'portal'
    }),
    addSetting({
        key: 'portal_account_gift_promotion',
        value: 'true',
        type: 'boolean',
        group: 'portal'
    })
);
