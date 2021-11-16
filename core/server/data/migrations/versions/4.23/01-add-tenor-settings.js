const {addSetting, combineTransactionalMigrations} = require('../../utils.js');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'tenor_api_key',
        value: null,
        type: 'string',
        group: 'tenor'
    }),
    addSetting({
        key: 'tenor_enabled',
        value: 'true',
        type: 'boolean',
        group: 'tenor'
    }),
    addSetting({
        key: 'tenor_contentfilter',
        value: 'off',
        type: 'string',
        group: 'tenor'
    })
);
