const {addPermissionToRole, combineTransactionalMigrations} = require('../../utils');
module.exports = combineTransactionalMigrations(
    addPermissionToRole({
        permission: 'Moderate comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Like comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Unlike comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Add comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Edit comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Delete comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Read comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Browse comments',
        role: 'Super Editor'
    }),
    addPermissionToRole({
        permission: 'Report comments',
        role: 'Super Editor'
    })
);
