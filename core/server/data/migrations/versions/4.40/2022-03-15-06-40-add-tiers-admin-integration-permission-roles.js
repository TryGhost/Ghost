const {combineTransactionalMigrations, addPermissionToRole} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Browse Products',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Read Products',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Edit Products',
        role: 'Admin Integration'
    }),
    addPermissionToRole({
        permission: 'Add Products',
        role: 'Admin Integration'
    })
);
