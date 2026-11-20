import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('users', 'comment_notifications', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
