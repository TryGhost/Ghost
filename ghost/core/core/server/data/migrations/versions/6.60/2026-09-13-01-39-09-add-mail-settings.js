const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'mail_transport',
        value: 'default',
        type: 'string',
        group: 'email'
    }),
    addSetting({
        key: 'mail_smtp_host',
        value: null,
        type: 'string',
        group: 'email'
    }),
    addSetting({
        key: 'mail_smtp_port',
        value: null,
        type: 'string',
        group: 'email'
    }),
    addSetting({
        key: 'mail_smtp_user',
        value: null,
        type: 'string',
        group: 'email'
    }),
    addSetting({
        key: 'mail_smtp_pass',
        value: null,
        type: 'string',
        group: 'email'
    }),
    addSetting({
        key: 'mail_smtp_secure',
        value: 'false',
        type: 'boolean',
        group: 'email'
    })
);

