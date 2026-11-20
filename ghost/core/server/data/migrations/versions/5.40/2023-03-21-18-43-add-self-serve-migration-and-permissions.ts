import { combineTransactionalMigrations, addPermissionWithRoles } from '../../utils';

export default combineTransactionalMigrations(
  addPermissionWithRoles(
    {
      name: 'Import database',
      action: 'importContent',
      object: 'db',
    },
    ['Self-Serve Migration Integration'],
  ),
  addPermissionWithRoles(
    {
      name: 'Add Members',
      action: 'add',
      object: 'member',
    },
    ['Self-Serve Migration Integration'],
  ),
  addPermissionWithRoles(
    {
      name: 'Read tags',
      action: 'read',
      object: 'tag',
    },
    ['Self-Serve Migration Integration'],
  ),
);
