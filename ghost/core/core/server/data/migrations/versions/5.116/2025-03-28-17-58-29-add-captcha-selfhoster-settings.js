const {addSetting, combineTransactionalMigrations} = require('../../utils');

module.exports = combineTransactionalMigrations([
    addSetting({
        key: 'captcha_sitekey',
        value: null,
        type: 'string',
        group: 'members'
    }),
    addSetting({
        key: 'captcha_secret',
        value: null,
        type: 'string',
        group: 'members'
    })
]);
