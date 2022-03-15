const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse Products',
        action: 'browse',
        object: 'product'
    }, ['Admin Integration']),
    addPermissionWithRoles({
        name: 'Read Products',
        action: 'read',
        object: 'product'
    }, ['Admin Integration']),
    addPermissionWithRoles({
        name: 'Edit Products',
        action: 'edit',
        object: 'product'
    }, ['Admin Integration']),
    addPermissionWithRoles({
        name: 'Add Products',
        action: 'add',
        object: 'product'
    }, ['Admin Integration'])
);
