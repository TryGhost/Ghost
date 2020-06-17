const {
    combineTransactionalMigrations,
    addPermission
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermission({
        name: 'Email preview',
        object: 'email_preview',
        action: 'read'
    }),

    addPermission({
        name: 'Send test email',
        object: 'email_preview',
        action: 'sendTestEmail'
    })
);
