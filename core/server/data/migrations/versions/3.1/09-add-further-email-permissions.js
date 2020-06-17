const {
    combineTransactionalMigrations,
    addPermissionWithRoles
} = require('../../utils');

module.exports = combineTransactionalMigrations(
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
