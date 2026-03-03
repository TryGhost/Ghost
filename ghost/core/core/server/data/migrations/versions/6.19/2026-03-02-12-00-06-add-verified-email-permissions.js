const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse verified emails',
        action: 'browse',
        object: 'verified_email'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Read verified emails',
        action: 'read',
        object: 'verified_email'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Add verified emails',
        action: 'add',
        object: 'verified_email'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Edit verified emails',
        action: 'edit',
        object: 'verified_email'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
