const {
    combineTransactionalMigrations,
    addPermissionWithRoles
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse snippets',
        action: 'browse',
        object: 'snippet'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor',
        'Author',
        'Contributor'
    ]),
    addPermissionWithRoles({
        name: 'Read snippets',
        action: 'read',
        object: 'snippet'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor',
        'Author',
        'Contributor'
    ]),
    addPermissionWithRoles({
        name: 'Edit snippets',
        action: 'edit',
        object: 'snippet'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor'
    ]),
    addPermissionWithRoles({
        name: 'Add snippets',
        action: 'add',
        object: 'snippet'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor'
    ]),
    addPermissionWithRoles({
        name: 'Delete snippets',
        action: 'destroy',
        object: 'snippet'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor'
    ])
);
