const {
    addPermissionToRole,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Read member signin urls',
        role: 'Administrator'
    })
);
