import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration(
  'automation_action_revisions',
  'email_clicked_count',
  {
    type: 'integer',
    nullable: true,
    unsigned: true,
  },
  { algorithm: 'auto' },
);
