// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

import logging from '@tryghost/logging';

// For DML - data changes
import { createTransactionalMigration } from '../../utils';

export default createTransactionalMigration(
  async function up(knex) {
    try {
      await knex('jobs')
        .whereIn('name', [
          'email-analytics-latest-opened',
          'email-analytics-latest-others',
          'email-analytics-missing',
        ])
        .del();
    } catch (error: any) {
      logging.info(`Failed to delete email analytics jobs: ${error.message}`);
    }
  },
  // down is a no-op
  async function down() {},
);
