const {
    addPermissionWithRoles,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse Members',
        action: 'browse',
        object: 'member'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Read Members',
        action: 'read',
        object: 'member'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Edit Members',
        action: 'edit',
        object: 'member'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Add Members',
        action: 'add',
        object: 'member'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Delete Members',
        action: 'destroy',
        object: 'member'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
