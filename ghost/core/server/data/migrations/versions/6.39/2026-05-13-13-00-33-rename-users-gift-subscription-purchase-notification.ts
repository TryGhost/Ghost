import { createRenameColumnMigration } from '../../utils';

export default createRenameColumnMigration(
  'users',
  'gift_subscription_purchase_notification',
  'gift_subscription_notifications',
);
