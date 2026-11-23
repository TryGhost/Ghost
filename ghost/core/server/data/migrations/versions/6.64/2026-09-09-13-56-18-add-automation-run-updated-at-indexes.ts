import { combineTransactionalMigrations, createAddIndexMigration } from '../../utils';

export default combineTransactionalMigrations(
  createAddIndexMigration('automation_runs', ['updated_at']),
  createAddIndexMigration('automation_run_steps', ['updated_at']),
);
