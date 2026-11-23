import logging from '@tryghost/logging';
import { createNonTransactionalMigration } from '../../utils';

export default createNonTransactionalMigration(
  async function up(knex) {
    logging.info('Clearing suppressions table');
    await knex('suppressions').truncate();
  },
  async function down() {
    logging.info('Not doing anything - table has been truncated');
  },
);
