import { combineTransactionalMigrations, addPermissionWithRoles } from '../../utils';

export default combineTransactionalMigrations(
  addPermissionWithRoles(
    {
      name: 'Browse automations',
      action: 'browse',
      object: 'automation',
    },
    ['Administrator', 'Admin Integration'],
  ),
  addPermissionWithRoles(
    {
      name: 'Read automations',
      action: 'read',
      object: 'automation',
    },
    ['Administrator', 'Admin Integration'],
  ),
  addPermissionWithRoles(
    {
      name: 'Edit automations',
      action: 'edit',
      object: 'automation',
    },
    ['Administrator', 'Admin Integration'],
  ),
);
