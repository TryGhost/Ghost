const { combineTransactionalMigrations, addPermissionWithRoles } = require('../../utils');

// Automations used to be a fixed pair of rows, so nothing could create one.
// Configurable triggers mean a site can have as many as it likes.
module.exports = combineTransactionalMigrations(
  addPermissionWithRoles(
    {
      name: 'Add automations',
      action: 'add',
      object: 'automation',
    },
    ['Administrator', 'Admin Integration'],
  ),
);
