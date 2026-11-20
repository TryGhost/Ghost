import { createAddIndexMigration } from '../../utils';

export default createAddIndexMigration('automated_email_recipients', ['mailgun_message_id'], {
  length: 31,
});
