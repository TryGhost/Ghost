const {
    addPermissionWithRoles,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse custom theme settings',
        action: 'browse',
        object: 'custom_theme_setting'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Edit custom theme settings',
        action: 'edit',
        object: 'custom_theme_setting'
    }, [
        'Administrator'
    ])
);
