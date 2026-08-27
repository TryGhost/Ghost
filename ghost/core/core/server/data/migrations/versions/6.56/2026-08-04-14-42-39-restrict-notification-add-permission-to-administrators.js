const { combineTransactionalMigrations, removePermissionFromRole } = require('../../utils');

module.exports = combineTransactionalMigrations(
  removePermissionFromRole({
    permission: 'Add notifications',
    role: 'Editor',
  }),
  removePermissionFromRole({
    permission: 'Add notifications',
    role: 'Super Editor',
  }),
);
