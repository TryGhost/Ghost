const logging = require('@tryghost/logging');
const {
  combineNonTransactionalMigrations,
  createAddColumnMigration,
  createNonTransactionalMigration,
} = require('../../utils');

const TABLE = 'members_custom_field_values';

// Who wrote the value that is here now: a type and an id, the way `actions` records an
// actor. The type is required because it is the namespace the id resolves in, and a value
// nobody can be traced to is not a record of provenance. The id is nullable for the one
// writer that resolves in no table — an import, until runs are tracked.
//
// Existing rows have a writer nobody can recover, so they go rather than get backfilled:
// the feature is behind the `membersCustomFields` flag with no released data, and adding
// a required column over them ends either in an error, as SQLite refuses one with no
// default, or in an invented writer wherever the engine supplies its own empty string.
module.exports = combineNonTransactionalMigrations(
  createNonTransactionalMigration(
    async function up(knex) {
      if (!(await knex.schema.hasColumn(TABLE, 'written_by_type'))) {
        logging.info(`Clearing ${TABLE} of values with no recorded writer`);
        await knex(TABLE).del();
      }
    },
    async function down() {
      // Nothing to undo: the rows are gone, and dropping the columns below is what a
      // rollback is for.
    },
  ),
  createAddColumnMigration(TABLE, 'written_by_type', {
    type: 'string',
    maxlength: 50,
    nullable: false,
  }),
  createAddColumnMigration(TABLE, 'written_by_id', {
    type: 'string',
    maxlength: 24,
    nullable: true,
  }),
);
