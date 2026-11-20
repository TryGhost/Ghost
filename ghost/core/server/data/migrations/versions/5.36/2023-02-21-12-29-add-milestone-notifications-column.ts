import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('users', 'milestone_notifications', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
