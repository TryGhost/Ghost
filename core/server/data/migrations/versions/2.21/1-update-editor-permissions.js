const {
    combineTransactionalMigrations,
    addPermissionWithRoles
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse notifications',
        action: 'browse',
        object: 'notification'
    }, [
        'Editor'
    ]),
    addPermissionWithRoles({
        name: 'Add notifications',
        action: 'add',
        object: 'notification'
    }, [
        'Editor'
    ]),
    addPermissionWithRoles({
        name: 'Delete notifications',
        action: 'destroy',
        object: 'notification'
    }, [
        'Editor'
    ])
);
