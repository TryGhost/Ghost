import { combineTransactionalMigrations, addPermissionToRole } from '../../utils';

export default combineTransactionalMigrations(
  addPermissionToRole({
    permission: 'Browse labels',
    role: 'Author',
  }),
  addPermissionToRole({
    permission: 'Read labels',
    role: 'Author',
  }),
);
