const {combineTransactionalMigrations, removePermissionFromRole} = require('../../utils');

// Notifications are broadcast to every Owner, Administrator and Editor who
// loads Ghost Admin, and the clients render their HTML unescaped. That makes
// "Add notifications" an admin-to-admin broadcast channel, which no editor-tier
// role needs - nothing in Ghost Admin posts notifications, the endpoint exists
// for the update-check service and for integrations.
//
// Browse and destroy are deliberately retained so editors can still see and
// dismiss notifications.
module.exports = combineTransactionalMigrations(
    removePermissionFromRole({
        permission: 'Add notifications',
        role: 'Editor'
    }),
    removePermissionFromRole({
        permission: 'Add notifications',
        role: 'Super Editor'
    })
);
