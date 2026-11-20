import { createAddIndexMigration } from '../../utils';

export default createAddIndexMigration('automation_run_steps', [
  'status',
  'ready_at',
  'created_at',
  'id',
]);
