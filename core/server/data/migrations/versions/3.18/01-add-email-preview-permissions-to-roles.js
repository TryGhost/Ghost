const {
    combineTransactionalMigrations,
    addPermissionToRole
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Email preview',
        role: 'Administrator'
    }),
    addPermissionToRole({
        permission: 'Email preview',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Email preview',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Email preview',
        role: 'Author'
    }),
    addPermissionToRole({
        permission: 'Email preview',
        role: 'Contributor'
    }),
    addPermissionToRole({
        permission: 'Send test email',
        role: 'Administrator'
    }),
    addPermissionToRole({
        permission: 'Send test email',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Send test email',
        role: 'Editor'
    })
);
