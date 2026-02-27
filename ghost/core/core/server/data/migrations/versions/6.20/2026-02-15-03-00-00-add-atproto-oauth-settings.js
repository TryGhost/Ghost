const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'atproto_oauth_enabled',
        value: 'false',
        type: 'boolean',
        group: 'members',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'atproto_client_name',
        value: '',
        type: 'string',
        group: 'members'
    })
);
