const {
    combineTransactionalMigrations,
    addPermissionToRole
} = require('../../utils');
//v1
module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Browse offers',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Read offers',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Edit offers',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Add offers',
        role: 'Admin Integration'
    })
);
