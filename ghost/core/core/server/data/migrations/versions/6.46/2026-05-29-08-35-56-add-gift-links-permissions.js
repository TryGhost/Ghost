const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    // Per-post create/read/reset — Admin/Editor/Super Editor/Author (Owner inherits all
    // permissions). Authors are limited to their own posts; that ownership check lives in
    // the gift_links API endpoint, not in the role grant.
    addPermissionWithRoles({
        name: 'Manage gift links',
        action: 'manage',
        object: 'gift_link'
    }, [
        'Administrator',
        'Editor',
        'Super Editor',
        'Author'
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
