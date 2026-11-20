import { combineTransactionalMigrations, createRemovePermissionMigration } from '../../utils';

const ROLES = ['Admin Integration', 'Administrator', 'Author', 'Editor', 'Contributor'];

const PERMISSIONS = [
  {
    name: 'Browse clients',
    object: 'client',
    action: 'browse',
  },
  {
    name: 'Read clients',
    object: 'client',
    action: 'read',
  },
  {
    name: 'Edit clients',
    object: 'client',
    action: 'edit',
  },
  {
    name: 'Add clients',
    object: 'client',
    action: 'add',
  },
  {
    name: 'Delete clients',
    object: 'client',
    action: 'delete',
  },
  {
    name: 'Browse subscribers',
    object: 'subscriber',
    action: 'browse',
  },
  {
    name: 'Read subscribers',
    object: 'subscriber',
    action: 'read',
  },
  {
    name: 'Edit subscribers',
    object: 'subscriber',
    action: 'edit',
  },
  {
    name: 'Add subscribers',
    object: 'subscriber',
    action: 'add',
  },
  {
    name: 'Delete subscribers',
    object: 'subscriber',
    action: 'delete',
  },
];

const migration = combineTransactionalMigrations(
  ...PERMISSIONS.map((p) => createRemovePermissionMigration(p, ROLES)),
);

migration.down = async function () {
  // no-op: we don't want to re-add the permissions
};

export default migration;
