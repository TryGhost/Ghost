const {addPermissionToRole, combineTransactionalMigrations} = require('../../utils');
module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Browse Members',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Read Members',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Edit Members',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Add Members',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Delete Members',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Read offers',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Browse offers',
        role: 'Editor'
    })
);