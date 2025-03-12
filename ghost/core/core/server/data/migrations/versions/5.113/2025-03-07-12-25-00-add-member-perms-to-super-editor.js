const {addPermissionToRole, combineTransactionalMigrations} = require('../../utils');
module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Browse Members',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read Members',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Edit Members',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Add Members',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Delete Members',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read offers',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse offers',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read member signin urls',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse notifications',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Add notifications',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Delete notifications',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Generate slugs',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse posts',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read posts',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Edit posts',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Add posts',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Delete posts',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Publish posts',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse settings',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read settings',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse tags',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read tags',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Edit tags',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Add tags',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Delete tags',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse themes',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'View active theme details',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse users',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read users',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Edit users',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Add users',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Delete users',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Assign a role',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse roles',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse invites',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read invites',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Add invites',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Delete invites',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Edit invites',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Email preview',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Send test email',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read emails',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse emails',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Retry emails',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse snippets',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read snippets',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Edit snippets',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Add snippets',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Delete snippets',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse labels',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read labels',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Edit labels',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Add labels',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Delete labels',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse Products',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read Products',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse newsletters',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read newsletters',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse collections',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read collections',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Edit collections',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Add collections',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Delete collections',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Moderate comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Like comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Unlike comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Add comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Edit comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Delete comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Report comments',
        role: 'Super Editor'
    })
);
