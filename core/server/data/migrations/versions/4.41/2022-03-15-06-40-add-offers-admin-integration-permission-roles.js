const {
    combineTransactionalMigrations,
    addPermissionToRole
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Browse Offers',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Read Offers',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Edit Offers',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Add Offers',
        role: 'Admin Integration'
    })
);
