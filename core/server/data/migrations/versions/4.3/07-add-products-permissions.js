const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse Products',
        action: 'browse',
        object: 'product'
    }, ['Admin']),
    addPermissionWithRoles({
        name: 'Read Products',
        action: 'read',
        object: 'product'
    }, ['Admin']),
    addPermissionWithRoles({
        name: 'Edit Products',
        action: 'edit',
        object: 'product'
    }, ['Admin']),
    addPermissionWithRoles({
        name: 'Add Products',
        action: 'add',
        object: 'product'
    }, ['Admin']),
    addPermissionWithRoles({
        name: 'Delete Products',
        action: 'destroy',
        object: 'product'
    }, ['Admin'])
);
