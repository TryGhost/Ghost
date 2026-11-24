import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration(
  'members_status_events',
  'batch_id',
  {
    type: 'string',
    maxlength: 24,
    nullable: true,
  },
  { algorithm: 'auto' },
);
