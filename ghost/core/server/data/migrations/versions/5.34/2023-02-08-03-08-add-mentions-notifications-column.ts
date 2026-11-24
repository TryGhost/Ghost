import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('users', 'mention_notifications', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
