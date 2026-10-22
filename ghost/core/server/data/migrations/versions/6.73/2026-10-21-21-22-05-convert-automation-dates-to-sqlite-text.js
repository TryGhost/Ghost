const DatabaseInfo = require('@tryghost/database-info');
const logging = require('@tryghost/logging');
const { createIrreversibleMigration } = require('../../utils');

const convertDateColumn = (knex, table, column) =>
  knex.raw(
    `UPDATE ??
     SET ?? = strftime('%Y-%m-%d %H:%M:%f', ?? / 1000.0, 'unixepoch')
     WHERE typeof(??) = 'integer'`,
    [table, column, column, column],
  );

module.exports = createIrreversibleMigration(async function up(knex) {
  if (!DatabaseInfo.isSQLite(knex)) {
    logging.info('Skipping SQLite-only automation timestamp migration on MySQL');
    return;
  }

  await convertDateColumn(knex, 'automation_runs', 'created_at');
  await convertDateColumn(knex, 'automation_runs', 'updated_at');
  await convertDateColumn(knex, 'automation_run_steps', 'created_at');
  await convertDateColumn(knex, 'automation_run_steps', 'updated_at');
  await convertDateColumn(knex, 'automation_run_steps', 'ready_at');
});
