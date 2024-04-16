const {combineTransactionalMigrations, addPermissionToRole} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Edit posts',
        role: 'Author'
    }),
    addPermissionToRole({
        permission: 'Edit posts',
        role: 'Contributor'
    }),
    addPermissionToRole({
        permission: 'Delete posts',
        role: 'Author'
    }),
    addPermissionToRole({
        permission: 'Delete posts',
        role: 'Contributor'
    })
);
