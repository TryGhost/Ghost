import logging from '@tryghost/logging';
import { createNonTransactionalMigration } from '../../utils';
import { getIndexes } from '../../../schema/commands';

const table = 'automation_run_steps';
const columns = ['status', 'priority', 'ready_at', 'created_at', 'id'];
// The name knex derives from the table and every column overruns MySQL's 64-character limit.
const indexName = 'automation_run_steps_status_priority_ready_at_index';

export default createNonTransactionalMigration(
  async function up(knex) {
    const indexes = await getIndexes(table, knex);
    if (indexes.includes(indexName)) {
      logging.warn(`Skipping adding index ${indexName} to ${table} - it already exists`);
      return;
    }

    logging.info(`Adding index ${indexName} to ${table}`);
    await knex.schema.table(table, (t) => {
      t.index(columns, indexName);
    });
  },
  async function down(knex) {
    const indexes = await getIndexes(table, knex);
    if (!indexes.includes(indexName)) {
      logging.warn(`Skipping dropping index ${indexName} from ${table} - it does not exist`);
      return;
    }

    logging.info(`Dropping index ${indexName} from ${table}`);
    await knex.schema.table(table, (t) => {
      t.dropIndex(columns, indexName);
    });
  },
);
