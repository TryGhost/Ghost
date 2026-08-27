const { createNonTransactionalMigration } = require('../../utils');
const { addIndex, dropIndex, getIndexes } = require('../../../schema/commands');

const table = 'automation_runs';
const compositeIndexColumns = ['automation_id', 'created_at'];
const foreignKeyIndexColumns = ['automation_id'];
const foreignKeyIndexName = 'automation_runs_automation_id_index';

module.exports = createNonTransactionalMigration(
  async function up(knex) {
    await addIndex(table, compositeIndexColumns, knex);

    // If this migration was rolled back (see `down`), we need to drop the
    // index it created.
    const indexes = await getIndexes(table, knex);
    if (indexes.includes(foreignKeyIndexName)) {
      await dropIndex(table, foreignKeyIndexColumns, knex);
    }
  },
  async function down(knex) {
    // Before this whole migration, MySQL had an implicit index on
    // `automation_id` because it was referenced by foreign keys. Adding the
    // composite index in `up` removes that, so we need to add it back if we
    // reverse the migration.
    await addIndex(table, foreignKeyIndexColumns, knex);
    await dropIndex(table, compositeIndexColumns, knex);
  },
);
