import { createAddColumnMigration, combineNonTransactionalMigrations } from '../../utils';

export default combineNonTransactionalMigrations(
  createAddColumnMigration('members_stripe_customers_subscriptions', 'discount_start', {
    type: 'dateTime',
    nullable: true,
  }),

  createAddColumnMigration('members_stripe_customers_subscriptions', 'discount_end', {
    type: 'dateTime',
    nullable: true,
  }),
);
