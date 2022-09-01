const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse Products',
        action: 'browse',
        object: 'product'
    }, ['Administrator', 'Editor', 'Author']),
    addPermissionWithRoles({
        name: 'Read Products',
        action: 'read',
        object: 'product'
    }, ['Administrator', 'Editor', 'Author']),
    addPermissionWithRoles({
        name: 'Edit Products',
        action: 'edit',
        object: 'product'
    }, ['Administrator']),
    addPermissionWithRoles({
        name: 'Add Products',
        action: 'add',
        object: 'product'
    }, ['Administrator']),
    addPermissionWithRoles({
        name: 'Delete Products',
        action: 'destroy',
        object: 'product'
    }, ['Administrator'])
);
