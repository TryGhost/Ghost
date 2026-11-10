const logging = require('@tryghost/logging');
const { createNonTransactionalMigration } = require('../../utils');
const { getIndexes, addIndex, dropIndex } = require('../../../schema/commands');

const table = 'automation_run_steps';
const indexName = 'automation_run_steps_queue_index';
const columns = ['automation_id', 'status', 'ready_at', 'created_at', 'id'];

module.exports = createNonTransactionalMigration(
  async function up(knex) {
    const indexes = await getIndexes(table, knex);
    if (!indexes.includes(indexName)) {
      logging.info(`Adding ${indexName}`);
      await knex.schema.table(table, (t) => t.index(columns, indexName));
    } else {
      logging.info(`Skipping existing ${indexName}`);
    }
    // Remove the standalone FK index retained after rollback, if present.
    if ((await getIndexes(table, knex)).includes(`${table}_automation_id_index`)) {
      await dropIndex(table, ['automation_id'], knex);
    }
  },
  async function down(knex) {
    if (!(await getIndexes(table, knex)).includes(indexName)) {
      logging.info(`Skipping missing ${indexName}`);
      return;
    }
    // InnoDB cannot drop the only index supporting this foreign key.
    await addIndex(table, ['automation_id'], knex);
    logging.info(`Dropping ${indexName}`);
    await knex.schema.table(table, (t) => t.dropIndex(columns, indexName));
  },
);
