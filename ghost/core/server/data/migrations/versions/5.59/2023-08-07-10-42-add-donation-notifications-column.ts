import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('users', 'donation_notifications', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
