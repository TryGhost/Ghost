const {addPermissionToRole, combineTransactionalMigrations} = require('../../utils');
module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Browse Members',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read Members',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Edit Members',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Add Members',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Delete Members',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read offers',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse offers',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read member signin urls',
        role: 'Super Editor'
    })
);