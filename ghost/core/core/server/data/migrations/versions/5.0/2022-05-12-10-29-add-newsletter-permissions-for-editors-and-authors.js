const {combineTransactionalMigrations, addPermissionToRole} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Browse newsletters',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Read newsletters',
        role: 'Editor'
    }),
    addPermissionToRole({
        permission: 'Browse newsletters',
        role: 'Author'
    }),
    addPermissionToRole({
        permission: 'Read newsletters',
        role: 'Author'
    })
);
