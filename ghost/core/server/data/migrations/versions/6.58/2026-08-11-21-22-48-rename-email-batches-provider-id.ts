import { createRenameColumnMigration } from '../../utils';

export default createRenameColumnMigration('email_batches', 'provider_id', 'mailgun_message_id', {
  algorithm: 'auto',
});
