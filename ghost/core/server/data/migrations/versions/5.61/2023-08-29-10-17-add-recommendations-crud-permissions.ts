import { combineTransactionalMigrations, addPermissionWithRoles } from '../../utils';

export default combineTransactionalMigrations(
  addPermissionWithRoles(
    {
      name: 'Browse recommendations',
      action: 'browse',
      object: 'recommendation',
    },
    ['Administrator', 'Admin Integration', 'Editor', 'Author', 'Contributor'],
  ),
  addPermissionWithRoles(
    {
      name: 'Read recommendations',
      action: 'read',
      object: 'recommendation',
    },
    ['Administrator', 'Admin Integration', 'Editor', 'Author', 'Contributor'],
  ),
  addPermissionWithRoles(
    {
      name: 'Edit recommendations',
      action: 'edit',
      object: 'recommendation',
    },
    ['Administrator', 'Admin Integration'],
  ),
  addPermissionWithRoles(
    {
      name: 'Add recommendations',
      action: 'add',
      object: 'recommendation',
    },
    ['Administrator', 'Admin Integration'],
  ),
  addPermissionWithRoles(
    {
      name: 'Delete recommendations',
      action: 'destroy',
      object: 'recommendation',
    },
    ['Administrator', 'Admin Integration'],
  ),
);
