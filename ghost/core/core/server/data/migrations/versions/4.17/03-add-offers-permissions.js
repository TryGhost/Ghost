const {
    addPermissionWithRoles,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse offers',
        action: 'browse',
        object: 'offer'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Read offers',
        action: 'read',
        object: 'offer'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Edit offers',
        action: 'edit',
        object: 'offer'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Add offers',
        action: 'add',
        object: 'offer'
    }, [
        'Administrator'
    ])
);
