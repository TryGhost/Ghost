const {
    combineTransactionalMigrations,
    addPermissionWithRoles
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse labels',
        action: 'browse',
        object: 'label'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Read labels',
        action: 'read',
        object: 'label'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Edit labels',
        action: 'edit',
        object: 'label'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Add labels',
        action: 'add',
        object: 'label'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Delete labels',
        action: 'destroy',
        object: 'label'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
