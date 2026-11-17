import logging from '@tryghost/logging';
import { createNonTransactionalMigration } from '../../utils';

const DatabaseInfo = require('@tryghost/database-info');

// A magic link's token stores the data the link was requested with, such as the member's name,
// labels and attribution. A magic link that redeems a gift also stores the values the recipient
// entered for the tier's requirements, such as a shipping address. VARCHAR(2000) is too short for
// a long address together with the rest, so the column becomes TEXT.
export default createNonTransactionalMigration(
  async function up(knex) {
    if (DatabaseInfo.isSQLite(knex)) {
      logging.warn('Skipping migration for SQLite3 (VARCHAR and TEXT columns are stored the same)');
      return;
    }

    logging.info('Changing tokens.data column from VARCHAR(2000) to TEXT');
    await knex.schema.alterTable('tokens', function (table) {
      // .alter() rebuilds the whole column definition, so NULL must be restated
      table.text('data').nullable().alter();
    });
  },
  async function down() {
    logging.warn(
      'Not changing tokens.data column back to VARCHAR(2000) as that could truncate stored data',
    );
  },
);
