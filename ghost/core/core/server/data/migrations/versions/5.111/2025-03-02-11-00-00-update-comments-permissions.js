const {addPermissionToRole, combineTransactionalMigrations, addPermission} = require('../../utils');
module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Moderate comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Like comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Unlike comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Add comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Edit comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Delete comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Read comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Browse comments',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Report comments',
        role: 'Editor'
    }),
);