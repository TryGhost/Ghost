import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('users', 'gift_subscription_purchase_notification', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
