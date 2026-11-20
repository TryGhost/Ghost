import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('users', 'gift_subscription_redemption_notification', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
