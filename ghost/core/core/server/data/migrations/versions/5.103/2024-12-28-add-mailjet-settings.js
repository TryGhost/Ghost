const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'mailjet_api_key',
        value: '',
        type: 'string',
        group: 'email'
    }),
    addSetting({
        key: 'mailjet_secret_key',
        value: '',
        type: 'string',
        group: 'email'
    }),
)