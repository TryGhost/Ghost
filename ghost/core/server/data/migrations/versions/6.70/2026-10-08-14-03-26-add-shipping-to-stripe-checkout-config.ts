import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('stripe_checkout_config', 'shipping', {
  type: 'text',
  maxlength: 65535,
  nullable: true,
});
