const {combineTransactionalMigrations, addPermissionWithRoles} = require('../../utils');

const RESOURCE = 'member_custom_field';

// Administrators and Admin Integrations define fields; Super Editors can read
// definitions so they can set values (values ride on the existing `member` edit
// permission). Other roles get no access to field definitions.
module.exports = combineTransactionalMigrations(
    addPermissionWithRoles({
        name: 'Browse member custom fields',
        action: 'browse',
        object: RESOURCE
    }, ['Administrator', 'Admin Integration', 'Super Editor']),
    addPermissionWithRoles({
        name: 'Read member custom fields',
        action: 'read',
        object: RESOURCE
    }, ['Administrator', 'Admin Integration', 'Super Editor']),
    addPermissionWithRoles({
        name: 'Add member custom fields',
        action: 'add',
        object: RESOURCE
    }, ['Administrator', 'Admin Integration']),
    addPermissionWithRoles({
        name: 'Edit member custom fields',
        action: 'edit',
        object: RESOURCE
    }, ['Administrator', 'Admin Integration']),
    addPermissionWithRoles({
        name: 'Delete member custom fields',
        action: 'destroy',
        object: RESOURCE
    }, ['Administrator', 'Admin Integration'])
);
