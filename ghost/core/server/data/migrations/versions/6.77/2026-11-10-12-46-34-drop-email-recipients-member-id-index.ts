const logging = require('@tryghost/logging');
const { createNonTransactionalMigration } = require('../../utils');
const { addIndex, dropIndex, getIndexes } = require('../../../schema/commands');

const table = 'email_recipients';
const compositeIndexName = 'email_recipients_member_id_opened_at_email_id_index';

// The (member_id, opened_at, email_id) index added in the previous migration
// has member_id as its leading column, so it serves every lookup the
// single-column member_id index did. Only drop the old index once the
// composite one is in place, so member_id lookups never lose index coverage.
module.exports = createNonTransactionalMigration(
  async function up(knex) {
    const indexes = await getIndexes(table, knex);

    if (!indexes.includes(compositeIndexName)) {
      logging.warn(
        `Skipping dropping index for 'member_id' in table '${table}' - ${compositeIndexName} does not exist`,
      );
      return;
    }

    await dropIndex(table, ['member_id'], knex);
  },
  async function down(knex) {
    await addIndex(table, ['member_id'], knex);
  },
);
