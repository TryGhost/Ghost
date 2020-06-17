const {
    addPermissionWithRoles,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Add webhooks',
        action: 'add',
        object: 'webhook'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Edit webhooks',
        action: 'edit',
        object: 'webhook'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Delete webhooks',
        action: 'destroy',
        object: 'webhook'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
