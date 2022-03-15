const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse Offers',
        action: 'browse',
        object: 'offer'
    }, ['Admin Integration']),
    addPermissionWithRoles({
        name: 'Read Offers',
        action: 'read',
        object: 'offer'
    }, ['Admin Integration']),
    addPermissionWithRoles({
        name: 'Edit Offers',
        action: 'edit',
        object: 'offer'
    }, ['Admin Integration']),
    addPermissionWithRoles({
        name: 'Add Offers',
        action: 'add',
        object: 'offer'
    }, ['Admin Integration'])
);
