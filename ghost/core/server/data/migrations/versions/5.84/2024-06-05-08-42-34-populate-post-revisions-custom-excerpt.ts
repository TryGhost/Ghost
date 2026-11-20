import logging from '@tryghost/logging';
import { createTransactionalMigration } from '../../utils';

export default createTransactionalMigration(
  async function up() {
    logging.warn('Skipping migration - noop');
  },
  async function down() {
    // Not required
  },
);
