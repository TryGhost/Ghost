const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse automated emails',
        action: 'browse',
        object: 'automated_email'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Read automated emails',
        action: 'read',
        object: 'automated_email'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Edit automated emails',
        action: 'edit',
        object: 'automated_email'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Add automated emails',
        action: 'add',
        object: 'automated_email'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Delete automated emails',
        action: 'destroy',
        object: 'automated_email'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
