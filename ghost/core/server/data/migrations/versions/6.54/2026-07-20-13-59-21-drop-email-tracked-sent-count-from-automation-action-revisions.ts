import { createDropColumnMigration } from '../../utils';

export default createDropColumnMigration(
  'automation_action_revisions',
  'email_tracked_sent_count',
  {
    type: 'integer',
    nullable: true,
    unsigned: true,
  },
  { algorithm: 'auto' },
);
