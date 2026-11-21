import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration(
  'automation_run_steps',
  'priority',
  {
    type: 'integer',
    nullable: false,
    unsigned: true,
    defaultTo: 10,
  },
  { algorithm: 'auto' },
);
