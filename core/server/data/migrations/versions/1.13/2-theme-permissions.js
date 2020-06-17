const {
    addPermissionWithRoles,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse themes',
        action: 'browse',
        object: 'theme'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor',
        'Author',
        'Contributor'
    ]),
    addPermissionWithRoles({
        name: 'Edit themes',
        action: 'edit',
        object: 'theme'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Activate themes',
        action: 'activate',
        object: 'theme'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Upload themes',
        action: 'add',
        object: 'theme'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Download themes',
        action: 'read',
        object: 'theme'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Delete themes',
        action: 'destroy',
        object: 'theme'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
