import { combineTransactionalMigrations, addPermissionToRole } from '../../utils';

export default combineTransactionalMigrations(
  addPermissionToRole({
    permission: 'Browse newsletters',
    role: 'Admin Integration',
  }),
  addPermissionToRole({
    permission: 'Read newsletters',
    role: 'Admin Integration',
  }),
  addPermissionToRole({
    permission: 'Edit newsletters',
    role: 'Admin Integration',
  }),
  addPermissionToRole({
    permission: 'Add newsletters',
    role: 'Admin Integration',
  }),
);
