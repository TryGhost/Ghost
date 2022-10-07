const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse labels',
        action: 'browse',
        object: 'label'
    }, ['Editor']),
    addPermissionWithRoles({
        name: 'Read labels',
        action: 'read',
        object: 'label'
    }, ['Editor'])
);
