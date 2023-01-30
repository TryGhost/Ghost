const {
    addPermissionWithRoles,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse mentions',
        action: 'browse',
        object: 'mention'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
