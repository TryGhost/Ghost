const {addSetting, combineTransactionalMigrations} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'ai_provider',
        value: null,
        type: 'string',
        group: 'ai'
    }),
    addSetting({
        key: 'ai_anthropic_api_key',
        value: null,
        type: 'string',
        group: 'ai'
    })
);
