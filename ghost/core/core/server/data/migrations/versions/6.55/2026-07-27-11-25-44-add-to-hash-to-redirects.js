const logging = require('@tryghost/logging');
const {
  combineNonTransactionalMigrations,
  createAddColumnMigration,
  createNonTransactionalMigration,
} = require('../../utils');
const {
  addIndex,
  addUnique,
  dropIndex,
  dropUnique,
  getIndexes,
} = require('../../../schema/commands');

const uniqueColumns = ['automation_action_revision_id', 'to_hash'];
const leftoverIndexName = 'redirects_automation_action_revision_id_index';

module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration(
    'redirects',
    'to_hash',
    {
      type: 'binary',
      maxlength: 32,
      nullable: true,
    },
    { algorithm: 'auto' },
  ),
  createNonTransactionalMigration(
    async function up(knex) {
      await addUnique('redirects', uniqueColumns, knex);

      // A previous down() leaves a standalone index behind (see below).
      // InnoDB drops the index it created for the foreign key itself once
      // the composite unique can serve the constraint, but not one we
      // created, so drop it here to keep a rolled-back-and-remigrated
      // database in the same shape as every other one.
      const indexes = await getIndexes('redirects', knex);

      if (indexes.includes(leftoverIndexName)) {
        await dropIndex('redirects', ['automation_action_revision_id'], knex);
      }
    },
    async function down(knex) {
      try {
        await dropUnique('redirects', uniqueColumns, knex);
      } catch (err) {
        // The composite unique ends up as the only index covering the
        // automation_action_revision_id FK: fresh installs create it
        // that way, and on upgrades InnoDB drops the FK's own index
        // once the composite can serve the constraint. MySQL won't
        // drop the last index a foreign key depends on, so re-add a
        // single-column one when it objects.
        if (err.code === 'ER_DROP_INDEX_FK') {
          logging.warn(
            'Cannot drop unique constraint over redirects(automation_action_revision_id, to_hash) while it backs the foreign key, re-adding index for automation_action_revision_id',
          );

          await addIndex('redirects', ['automation_action_revision_id'], knex);
          await dropUnique('redirects', uniqueColumns, knex);
          return;
        }

        throw err;
      }
    },
  ),
);
