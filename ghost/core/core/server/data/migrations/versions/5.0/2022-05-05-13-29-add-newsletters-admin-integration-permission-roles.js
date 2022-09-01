const {combineTransactionalMigrations, addPermissionToRole} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Browse newsletters',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Read newsletters',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Edit newsletters',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Add newsletters',
        role: 'Admin Integration'
    })
);
