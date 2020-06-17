const {
    addPermissionToRole,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Backup database',
        role: 'Administrator'
    }),
    addPermissionToRole({
        permission: 'Backup database',
        role: 'DB Backup Integration'
    })
);
