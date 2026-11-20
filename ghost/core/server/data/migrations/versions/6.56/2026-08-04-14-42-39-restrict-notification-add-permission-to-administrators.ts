import { combineTransactionalMigrations, removePermissionFromRole } from '../../utils';

export default combineTransactionalMigrations(
  removePermissionFromRole({
    permission: 'Add notifications',
    role: 'Editor',
  }),
  removePermissionFromRole({
    permission: 'Add notifications',
    role: 'Super Editor',
  }),
);
