const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse comments',
        action: 'browse',
        object: 'comment'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Read comments',
        action: 'read',
        object: 'comment'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Edit comments',
        action: 'edit',
        object: 'comment'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Add comments',
        action: 'add',
        object: 'comment'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Delete comments',
        action: 'destroy',
        object: 'comment'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Moderate comments',
        action: 'moderate',
        object: 'comment'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Like comments',
        action: 'like',
        object: 'comment'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Unlike comments',
        action: 'unlike',
        object: 'comment'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
