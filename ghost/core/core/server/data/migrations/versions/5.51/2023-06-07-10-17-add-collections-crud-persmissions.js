const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse collections',
        action: 'browse',
        object: 'collection'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor',
        'Author',
        'Contributor'
    ]),
    addPermissionWithRoles({
        name: 'Read collections',
        action: 'read',
        object: 'collection'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor',
        'Author',
        'Contributor'
    ]),
    addPermissionWithRoles({
        name: 'Edit collections',
        action: 'edit',
        object: 'collection'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor'
    ]),
    addPermissionWithRoles({
        name: 'Add collections',
        action: 'add',
        object: 'collection'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor',
        'Author'
    ]),
    addPermissionWithRoles({
        name: 'Delete collections',
        action: 'destroy',
        object: 'collection'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor'
    ])
);
