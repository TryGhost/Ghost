import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('gifts', 'consumes_soon_reminder_sent_at', {
  type: 'dateTime',
  nullable: true,
});
