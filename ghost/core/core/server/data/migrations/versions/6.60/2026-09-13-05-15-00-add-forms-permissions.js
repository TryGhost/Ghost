const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse forms',
        action: 'browse',
        object: 'form'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor'
    ]),
    addPermissionWithRoles({
        name: 'Read forms',
        action: 'read',
        object: 'form'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor'
    ]),
    addPermissionWithRoles({
        name: 'Edit forms',
        action: 'edit',
        object: 'form'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor'
    ]),
    addPermissionWithRoles({
        name: 'Add forms',
        action: 'add',
        object: 'form'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor'
    ]),
    addPermissionWithRoles({
        name: 'Delete forms',
        action: 'destroy',
        object: 'form'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor'
    ])
);
