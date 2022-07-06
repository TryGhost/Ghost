const {addPermissionToRole, combineTransactionalMigrations} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Browse Members',
        role: 'Ghost Explore Integration'
    }),
    addPermissionToRole({
        permission: 'Browse newsletters',
        role: 'Ghost Explore Integration'
    }),
    addPermissionToRole({
        permission: 'Browse posts',
        role: 'Ghost Explore Integration'
    }),
    addPermissionToRole({
        permission: 'Browse settings',
        role: 'Ghost Explore Integration'
    })
);
