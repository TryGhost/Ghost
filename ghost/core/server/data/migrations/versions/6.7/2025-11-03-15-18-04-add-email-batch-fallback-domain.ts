import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('email_batches', 'fallback_sending_domain', {
  type: 'boolean',
  nullable: false,
  defaultTo: false,
});
