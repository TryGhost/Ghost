const logging = require('@tryghost/logging');
const {
  combineNonTransactionalMigrations,
  createAddColumnMigration,
  createNonTransactionalMigration,
} = require('../../utils');
const { getIndexes } = require('../../../schema/commands');

const priorityColumn = { type: 'string', maxlength: 4, nullable: false, defaultTo: 'low' };
const stepsTable = 'automation_run_steps';
const indexName = 'automation_run_steps_ready_priority_index';
const indexColumns = ['status', 'priority', 'ready_at', 'created_at', 'id'];

module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration('automation_runs', 'priority', priorityColumn),
  createAddColumnMigration(stepsTable, 'priority', priorityColumn),
  createNonTransactionalMigration(
    async function up(knex) {
      if ((await getIndexes(stepsTable, knex)).includes(indexName)) {
        logging.info(`Index ${indexName} already exists`);
        return;
      }

      logging.info(`Adding index ${indexName}`);
      await knex.schema.table(stepsTable, (table) => table.index(indexColumns, indexName));
    },
    async function down(knex) {
      if (!(await getIndexes(stepsTable, knex)).includes(indexName)) {
        logging.info(`Index ${indexName} does not exist`);
        return;
      }

      logging.info(`Dropping index ${indexName}`);
      await knex.schema.table(stepsTable, (table) => table.dropIndex(indexColumns, indexName));
    },
  ),
);
