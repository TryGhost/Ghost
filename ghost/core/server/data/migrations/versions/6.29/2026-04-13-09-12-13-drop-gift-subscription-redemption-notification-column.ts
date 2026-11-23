import { createDropColumnMigration } from '../../utils';

export default createDropColumnMigration('users', 'gift_subscription_redemption_notification', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
