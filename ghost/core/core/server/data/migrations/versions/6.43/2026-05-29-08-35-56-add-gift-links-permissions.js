const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    // Per-post create/read/reset — Admin/Editor (Owner inherits all permissions)
    addPermissionWithRoles({
        name: 'Manage gift links',
        action: 'manage',
        object: 'gift_link'
    }, [
        'Administrator',
        'Editor'
    ]),
    // Site-wide reset-all — Admin only (Owner inherits all permissions), tighter than per-post
    addPermissionWithRoles({
        name: 'Reset all gift links',
        action: 'resetAll',
        object: 'gift_link'
    }, [
        'Administrator'
    ])
);
