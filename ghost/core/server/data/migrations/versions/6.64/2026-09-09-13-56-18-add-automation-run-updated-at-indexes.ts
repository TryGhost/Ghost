const { combineTransactionalMigrations, createAddIndexMigration } = require('../../utils');

module.exports = combineTransactionalMigrations(
  createAddIndexMigration('automation_runs', ['updated_at']),
  createAddIndexMigration('automation_run_steps', ['updated_at']),
);
