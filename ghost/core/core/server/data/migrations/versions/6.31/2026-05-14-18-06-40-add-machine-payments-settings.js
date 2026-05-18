const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'machine_payments_enabled',
        value: false,
        type: 'boolean',
        group: 'site'
    }),
    addSetting({
        key: 'machine_payments_currency',
        value: 'USD',
        type: 'string',
        group: 'site'
    }),
    addSetting({
        key: 'machine_payments_amount',
        value: 100,
        type: 'number',
        group: 'site'
    })
);
