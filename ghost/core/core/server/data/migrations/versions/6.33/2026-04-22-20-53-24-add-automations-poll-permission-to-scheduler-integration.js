const {combineTransactionalMigrations, addPermission, addPermissionToRole} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermission({
        name: 'Poll automations',
        action: 'poll',
        object: 'automation'
    }),
    addPermissionToRole({
        permission: 'Poll automations',
        role: 'Scheduler Integration'
    })
);
