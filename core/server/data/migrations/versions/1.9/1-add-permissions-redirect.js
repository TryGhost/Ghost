const {
    addPermissionWithRoles,
    combineTransactionalMigrations
} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Download redirects',
        action: 'download',
        object: 'redirect'
    }, [
        'Administrator',
        'Admin Integration'
    ]),
    addPermissionWithRoles({
        name: 'Upload redirects',
        action: 'download',
        object: 'redirect'
    }, [
        'Administrator',
        'Admin Integration'
    ])
);
