const {combineTransactionalMigrations, addPermissionToRole} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Browse labels',
        role: 'Author'
    }),
    addPermissionToRole({
        permission: 'Read labels',
        role: 'Author'
    })
);
