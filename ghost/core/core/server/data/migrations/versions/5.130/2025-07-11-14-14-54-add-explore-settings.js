const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'explore_ping',
        value: 'true',
        type: 'boolean',
        group: 'explore'
    }),
    addSetting({
        key: 'explore_ping_growth',
        value: 'false',
        type: 'boolean',
        group: 'explore'
    })
);
