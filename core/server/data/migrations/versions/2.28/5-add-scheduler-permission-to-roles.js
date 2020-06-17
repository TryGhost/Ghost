const {
    addPermissionToRole,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Publish posts',
        role: 'Administrator'
    }),
    addPermissionToRole({
        permission: 'Publish posts',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Publish posts',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Publish posts',
        role: 'Scheduler Integration'
    })
);
