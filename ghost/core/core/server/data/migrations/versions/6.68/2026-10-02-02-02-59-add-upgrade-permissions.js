const { combineTransactionalMigrations, addPermissionWithRoles } = require('../../utils');

module.exports = combineTransactionalMigrations(
  addPermissionWithRoles({ name: 'Browse upgrades', action: 'browse', object: 'upgrade' }, [
    'Administrator',
  ]),
  addPermissionWithRoles({ name: 'Read upgrades', action: 'read', object: 'upgrade' }, [
    'Administrator',
  ]),
  addPermissionWithRoles({ name: 'Add upgrades', action: 'add', object: 'upgrade' }, [
    'Administrator',
  ]),
);
