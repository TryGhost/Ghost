const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse email templates',
        action: 'browse',
        object: 'email_template'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Read email templates',
        action: 'read',
        object: 'email_template'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Edit email templates',
        action: 'edit',
        object: 'email_template'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
