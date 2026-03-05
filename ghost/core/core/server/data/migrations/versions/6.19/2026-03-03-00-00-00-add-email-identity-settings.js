const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'email_default_sender_name',
        value: null,
        type: 'string',
        group: 'email'
    }),
    addSetting({
        key: 'email_default_sender_email',
        value: null,
        type: 'string',
        group: 'email'
    }),
    addSetting({
        key: 'email_default_sender_reply_to',
        value: null,
        type: 'string',
        group: 'email'
    })
);
