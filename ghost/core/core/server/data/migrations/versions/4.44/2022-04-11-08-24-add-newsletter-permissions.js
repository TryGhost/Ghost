const {
    addPermissionWithRoles,
    combineTransactionalMigrations
} = require('../../utils');

/**
 * This is similar to core/server/data/migrations/versions/4.42/2022-03-30-15-44-add-newsletter-permissions.js
 * as the permissions were not added in the fixture file at the time of the migration.
 * This means the new Ghost installs do not have the newsletter permission and we need this migration.
*/
module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse newsletters',
        action: 'browse',
        object: 'newsletter'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Add newsletters',
        action: 'add',
        object: 'newsletter'
    }, [
        'Administrator'
    ]),
    addPermissionWithRoles({
        name: 'Edit newsletters',
        action: 'edit',
        object: 'newsletter'
    }, [
        'Administrator'
    ])
);
