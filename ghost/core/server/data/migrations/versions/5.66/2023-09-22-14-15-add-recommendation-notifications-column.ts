import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('users', 'recommendation_notifications', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
