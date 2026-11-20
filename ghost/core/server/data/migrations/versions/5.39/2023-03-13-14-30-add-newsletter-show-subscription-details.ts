import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('newsletters', 'show_subscription_details', {
  type: 'boolean',
  nullable: false,
  defaultTo: false,
});
