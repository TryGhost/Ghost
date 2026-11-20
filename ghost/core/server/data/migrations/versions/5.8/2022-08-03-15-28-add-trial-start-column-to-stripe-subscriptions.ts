import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration(
  'members_stripe_customers_subscriptions',
  'trial_start_at',
  {
    type: 'dateTime',
    nullable: true,
  },
);
