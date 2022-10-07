const {
    addPermissionWithRoles,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse newsletters',
        action: 'browse',
        object: 'newsletter'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Add newsletters',
        action: 'add',
        object: 'newsletter'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Edit newsletters',
        action: 'edit',
        object: 'newsletter'
    }, [
        'Administrator'
    ])
);
