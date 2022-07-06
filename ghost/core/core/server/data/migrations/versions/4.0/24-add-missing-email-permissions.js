const {
    addPermissionWithRoles,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Read emails',
        action: 'read',
        object: 'email'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor',
        'Author',
        'Contributor'
    ]),
    addPermissionWithRoles({
        name: 'Browse emails',
        action: 'browse',
        object: 'email'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor'
    ]),
    addPermissionWithRoles({
        name: 'Retry emails',
        action: 'retry',
        object: 'email'
    }, [
        'Administrator',
        'Admin Integration',
        'Editor'
    ])
);
