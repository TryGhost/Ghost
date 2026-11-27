import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('stripe_checkout_config', 'phone', {
  type: 'text',
  maxlength: 65535,
  nullable: true,
});
