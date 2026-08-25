const logging = require('@tryghost/logging');
const { createNonTransactionalMigration } = require('../../utils');
const {
  addColumn,
  dropColumn,
  addUnique,
  dropUnique,
  addIndex,
  dropIndex,
} = require('../../../schema/commands');

const TABLE = 'members_custom_field_values';

// Named explicitly; the derived name would overrun MySQL's identifier limit, which
// schema.test.js checks for every table.
const LEAF_UNIQUE = 'members_custom_field_values_leaf_unique';

// Values are discarded rather than converted: custom fields sit behind a private flag and
// have never been released, so only a site deliberately opted in can hold one.
async function discardStoredValues(knex) {
  const discarded = await knex(TABLE).del();
  if (discarded > 0) {
    logging.warn(
      `Discarded ${discarded} custom field value(s): the storage format changed before the feature was released`,
    );
  }
}

// Column changes ask for `auto` so MySQL picks an in-place algorithm where it can; the
// helpers otherwise default to a full table copy, which blocks writes.
//
// Two constraints shape the order of everything below.
//
// MySQL refuses to drop the last index serving a foreign key, counting any index whose
// leftmost column is the referencing one, so each replacement is added before the thing
// it replaces is dropped.
//
// This migration is not transactional, so a crash leaves the table half-changed with
// nothing recorded as done and knex-migrator runs it again on the next boot. Every step
// therefore tolerates having already happened: the constraint and index helpers swallow
// that themselves, the column steps ask first.
module.exports = createNonTransactionalMigration(
  async function up(knex) {
    // First, so nothing can collide with the new constraint.
    await discardStoredValues(knex);

    if (!(await knex.schema.hasColumn(TABLE, 'path'))) {
      await addColumn(TABLE, 'path', knex, undefined, { algorithm: 'auto' });
    }

    // A later 6.58 migration re-keys this table onto `custom_field_key`, dropping
    // `custom_field_id`. The idempotency check re-runs every up against that final
    // schema, so guard these on the column: gone, they are a no-op here rather than an
    // error on the missing column (MySQL raises it; SQLite swallows it). A forward run
    // always sees the column present, so this changes nothing an install ever applies.
    const hasFieldId = await knex.schema.hasColumn(TABLE, 'custom_field_id');

    if (hasFieldId) {
      // `member_id` stays leftmost, covering that foreign key the moment this exists.
      await addUnique(TABLE, ['member_id', 'custom_field_id', 'path'], knex, LEAF_UNIQUE);
      await dropUnique(TABLE, ['member_id', 'custom_field_id'], knex);
    }

    if (await knex.schema.hasColumn(TABLE, 'value_json')) {
      await dropColumn(TABLE, 'value_json', knex, {}, { algorithm: 'auto' });
    }

    if (hasFieldId) {
      await addIndex(TABLE, ['custom_field_id', 'path'], knex);

      // Only present after a rollback, where `down` adds it to keep a foreign key
      // covered. Leaving it would be drift against a fresh install.
      await dropIndex(TABLE, ['custom_field_id'], knex);
    }
  },
  async function down(knex) {
    // Rebuilding a composite would need the field-type catalog, which a migration must
    // not read: it has to keep working when the catalog moves on.
    await discardStoredValues(knex);

    await addUnique(TABLE, ['member_id', 'custom_field_id'], knex);
    await dropUnique(TABLE, ['member_id', 'custom_field_id', 'path'], knex, LEAF_UNIQUE);

    // Back before the composite one goes, or MySQL has nothing covering that key.
    await addIndex(TABLE, ['custom_field_id'], knex);
    await dropIndex(TABLE, ['custom_field_id', 'path'], knex);

    if (!(await knex.schema.hasColumn(TABLE, 'value_json'))) {
      await addColumn(
        TABLE,
        'value_json',
        knex,
        { type: 'text', maxlength: 65535, nullable: true },
        { algorithm: 'auto' },
      );
    }
    if (await knex.schema.hasColumn(TABLE, 'path')) {
      await dropColumn(TABLE, 'path', knex, {}, { algorithm: 'auto' });
    }
  },
);
