const { combineTransactionalMigrations, createRemovePermissionMigration } = require('../../utils');

const RESOURCE = 'member_custom_field';

// Reading a field definition is no longer a permission. A definition says a site collects
// a shoe size; every signed-in member already sees the whole list through Portal, so
// gating staff behind a role protected nothing and inverted the two halves: an integration
// holding `member: browse` received members' field values on the member payload, which
// never consults this permission, while a request for the definitions describing those
// values was refused.
//
// What remains on this resource is defining fields, which stays with the publisher.
module.exports = combineTransactionalMigrations(
  createRemovePermissionMigration(
    {
      name: 'Browse member custom fields',
      action: 'browse',
      object: RESOURCE,
    },
    ['Administrator', 'Admin Integration', 'Super Editor'],
  ),
  createRemovePermissionMigration(
    {
      name: 'Read member custom fields',
      action: 'read',
      object: RESOURCE,
    },
    ['Administrator', 'Admin Integration', 'Super Editor'],
  ),
);
