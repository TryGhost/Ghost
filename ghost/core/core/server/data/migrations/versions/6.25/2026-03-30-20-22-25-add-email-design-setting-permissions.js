const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse email design settings',
        action: 'browse',
        object: 'email_design_setting'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Read email design settings',
        action: 'read',
        object: 'email_design_setting'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Edit email design settings',
        action: 'edit',
        object: 'email_design_setting'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Add email design settings',
        action: 'add',
        object: 'email_design_setting'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Delete email design settings',
        action: 'destroy',
        object: 'email_design_setting'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
