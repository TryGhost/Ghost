import { addUnique, dropUnique } from '../../../schema/commands';
import { createNonTransactionalMigration } from '../../utils';

// Two segments can't have one slug. The index has a migration of its own, so that each step
// checks for its own result: `addUnique` counts an index that already exists as added, so the
// index is added whatever an earlier run of these migrations left, and `dropUnique` counts one
// that doesn't exist as dropped.
//
// It comes after the migration that makes the column required, and is rolled back before it:
// SQLite changes a column's nullability by rebuilding the table, and that rebuild then never has
// to carry the index.

const TABLE = 'segments';

export default createNonTransactionalMigration(
  async function up(knex) {
    await addUnique(TABLE, 'slug', knex);
  },
  async function down(knex) {
    await dropUnique(TABLE, 'slug', knex);
  },
);
