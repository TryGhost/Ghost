const logging = require('@tryghost/logging');
const { createNonTransactionalMigration } = require('../../utils');
const commands = require('../../../schema/commands');

const TABLE = 'members_custom_field_values';

// The table keyed by the field's key, as it is now. `custom_field_key` is a foreign key
// to the definition's immutable, unique `key`.
const KEY_SHAPE = {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  custom_field_key: {
    type: 'string',
    maxlength: 191,
    nullable: false,
    references: 'members_custom_fields.key',
    cascadeDelete: true,
  },
  member_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'members.id',
    cascadeDelete: true,
  },
  path: { type: 'string', maxlength: 191, nullable: false, defaultTo: '' },
  value_text: { type: 'text', maxlength: 65535, nullable: true },
  created_at: { type: 'dateTime', nullable: false },
  updated_at: { type: 'dateTime', nullable: true },
  '@@UNIQUE_CONSTRAINTS@@': [
    {
      columns: ['member_id', 'custom_field_key', 'path'],
      indexName: 'members_custom_field_values_leaf_unique',
    },
  ],
  '@@INDEXES@@': [['custom_field_key', 'path']],
};

// The prior shape, keyed by the field's id. Rebuilding it exactly is what makes the
// rollback reversible: the earlier leaf-rows migration's `down` alters `custom_field_id`
// (re-adding its indexes), so that column has to be back before this migration hands the
// rollback on. Identical to KEY_SHAPE apart from the foreign key column.
const ID_SHAPE = {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  custom_field_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'members_custom_fields.id',
    cascadeDelete: true,
  },
  member_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'members.id',
    cascadeDelete: true,
  },
  path: { type: 'string', maxlength: 191, nullable: false, defaultTo: '' },
  value_text: { type: 'text', maxlength: 65535, nullable: true },
  created_at: { type: 'dateTime', nullable: false },
  updated_at: { type: 'dateTime', nullable: true },
  '@@UNIQUE_CONSTRAINTS@@': [
    {
      columns: ['member_id', 'custom_field_id', 'path'],
      indexName: 'members_custom_field_values_leaf_unique',
    },
  ],
  '@@INDEXES@@': [['custom_field_id', 'path']],
};

// SQLite cannot alter a foreign key in place, so the column swap is a drop-and-recreate
// rather than an ALTER. Existing rows are discarded either way: the feature is behind the
// `membersCustomFields` flag with no released data, so a wipe is cheaper than a backfill.
// Re-running after a mid-migration crash is safe — the table is dropped first if present.
async function rebuild(knex, shape, from) {
  // A crash between the drop and the create leaves no table to convert; recreate it as
  // whichever shape this direction wanted.
  if (!(await knex.schema.hasTable(TABLE))) {
    await commands.createTable(TABLE, knex, shape);
    return;
  }

  // Only when the table is still the shape this converts from. Migrations are replayed
  // against whatever schema is current, and rebuilding from a fixed shape then would
  // undo a later migration's work — including pointing a foreign key at a constraint
  // that migration had narrowed, which nothing can then write through.
  if (!(await knex.schema.hasColumn(TABLE, from))) {
    logging.info(`${TABLE} is not keyed by ${from}, leaving it alone`);
    return;
  }

  await commands.deleteTable(TABLE, knex);
  await commands.createTable(TABLE, knex, shape);
}

module.exports = createNonTransactionalMigration(
  async function up(knex) {
    logging.info('Keying members_custom_field_values by custom_field_key');
    await rebuild(knex, KEY_SHAPE, 'custom_field_id');
  },
  async function down(knex) {
    logging.info('Reverting members_custom_field_values to custom_field_id');
    await rebuild(knex, ID_SHAPE, 'custom_field_key');
  },
);
