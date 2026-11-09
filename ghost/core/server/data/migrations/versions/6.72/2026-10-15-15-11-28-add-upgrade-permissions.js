const { combineTransactionalMigrations, addPermissionWithRoles } = require('../../utils');

const RESOURCE = 'upgrade';

// Only Administrators (and the Owner, who needs no grant) can request host-managed
// updates. Integrations get none.
module.exports = combineTransactionalMigrations(
  addPermissionWithRoles(
    {
      name: 'Browse upgrades',
      action: 'browse',
      object: RESOURCE,
    },
    ['Administrator'],
  ),
  addPermissionWithRoles(
    {
      name: 'Read upgrades',
      action: 'read',
      object: RESOURCE,
    },
    ['Administrator'],
  ),
  addPermissionWithRoles(
    {
      name: 'Add upgrades',
      action: 'add',
      object: RESOURCE,
    },
    ['Administrator'],
  ),
);
