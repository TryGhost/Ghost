const logging = require('@tryghost/logging');
const { createNonTransactionalMigration } = require('../../utils');
const commands = require('../../../schema/commands');
const views = require('../../../schema/views');

const FIELDS = 'members_custom_fields';
const VALUES = 'members_custom_field_values';
const VIEW = 'members_custom_field_leaves';

const PUBLISHER_NAMESPACE = 'custom_fields';

const NAMESPACE_COLUMN = {
  type: 'string',
  maxlength: 191,
  nullable: false,
  defaultTo: PUBLISHER_NAMESPACE,
};

const MEMBER_COLUMN = {
  type: 'string',
  maxlength: 24,
  nullable: false,
  references: 'members.id',
  cascadeDelete: true,
};

const LEAF_COLUMNS = {
  path: { type: 'string', maxlength: 191, nullable: false, defaultTo: '' },
  value_text: { type: 'text', maxlength: 65535, nullable: true },
  created_at: { type: 'dateTime', nullable: false },
  updated_at: { type: 'dateTime', nullable: true },
};

// Keyed by the field's id alone. What a filter names a field by — its namespace and key
// — is resolved by the view this migration creates.
const ID_SHAPE = {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  field_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: `${FIELDS}.id`,
    cascadeDelete: true,
  },
  member_id: MEMBER_COLUMN,
  ...LEAF_COLUMNS,
  '@@UNIQUE_CONSTRAINTS@@': [
    {
      columns: ['member_id', 'field_id', 'path'],
      indexName: 'members_custom_field_values_leaf_unique',
    },
  ],
  '@@INDEXES@@': [['field_id', 'path']],
};

// The shape this converts from, keyed by a definition's key back when one was unique on
// its own.
const KEY_SHAPE = {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  custom_field_key: {
    type: 'string',
    maxlength: 191,
    nullable: false,
    references: `${FIELDS}.key`,
    cascadeDelete: true,
  },
  member_id: MEMBER_COLUMN,
  ...LEAF_COLUMNS,
  '@@UNIQUE_CONSTRAINTS@@': [
    {
      columns: ['member_id', 'custom_field_key', 'path'],
      indexName: 'members_custom_field_values_leaf_unique',
    },
  ],
  '@@INDEXES@@': [['custom_field_key', 'path']],
};

// Drop and recreate rather than alter, for the reason the migration that last swapped
// this reference gives: SQLite cannot alter a foreign key in place. Rows are discarded,
// as they were then — the feature is behind the `membersCustomFields` flag with no
// released data, so a wipe costs nothing a backfill would save.
async function rebuild(knex, shape) {
  if (await knex.schema.hasTable(VALUES)) {
    await commands.deleteTable(VALUES, knex);
  }
  await commands.createTable(VALUES, knex, shape);
}

/** Whether the table is already the shape this converts it to. */
function keyedByFieldId(knex) {
  return knex.schema.hasColumn(VALUES, 'field_id');
}

module.exports = createNonTransactionalMigration(
  async function up(knex) {
    // Guarded, like every other step here: `addColumn` raises on a column that already
    // exists, and a replay runs this against a schema that already has it.
    if (await knex.schema.hasColumn(FIELDS, 'namespace')) {
      logging.info(`${FIELDS}.namespace already exists`);
    } else {
      logging.info(`Adding ${FIELDS}.namespace`);
      await commands.addColumn(FIELDS, 'namespace', knex, NAMESPACE_COLUMN);
    }

    // Before the constraint narrows, so nothing is left referencing a key that is about
    // to stop being unique on its own. Migrations are replayed against whatever schema
    // is current, so a table already in this shape is left alone.
    if (await keyedByFieldId(knex)) {
      logging.info(`${VALUES} is already keyed by field id`);
    } else {
      logging.info(`Rebuilding ${VALUES} keyed by field id`);
      await rebuild(knex, ID_SHAPE);
    }

    logging.info(`Scoping ${FIELDS} key and name uniqueness by namespace`);
    await commands.dropUnique(FIELDS, 'key', knex);
    await commands.dropUnique(FIELDS, 'name', knex);
    await commands.addUnique(
      FIELDS,
      ['namespace', 'key'],
      knex,
      'members_custom_fields_namespace_key_unique',
    );
    await commands.addUnique(
      FIELDS,
      ['namespace', 'name'],
      knex,
      'members_custom_fields_namespace_name_unique',
    );

    logging.info(`Creating the ${VIEW} view`);
    await knex.schema.createViewOrReplace(VIEW, function (view) {
      view.as(knex.raw(views[VIEW]));
    });
  },
  async function down(knex) {
    // First: SQLite rebuilds a table to alter it, and validates every view while the
    // table is renamed away. A view over either table below fails that check.
    logging.info(`Dropping the ${VIEW} view`);
    await knex.schema.dropViewIfExists(VIEW);

    // A field outside the publisher's namespace has nothing left to be unique against
    // once the namespace stops being part of the constraint, and its values go with the
    // rebuild below.
    logging.info(`Dropping fields outside the ${PUBLISHER_NAMESPACE} namespace`);
    await knex(FIELDS).whereNot('namespace', PUBLISHER_NAMESPACE).del();

    logging.info(`Restoring ${FIELDS} key and name uniqueness`);
    await commands.dropUnique(
      FIELDS,
      ['namespace', 'key'],
      knex,
      'members_custom_fields_namespace_key_unique',
    );
    await commands.dropUnique(
      FIELDS,
      ['namespace', 'name'],
      knex,
      'members_custom_fields_namespace_name_unique',
    );
    await commands.addUnique(FIELDS, 'key', knex);
    await commands.addUnique(FIELDS, 'name', knex);

    // Only once a key is unique on its own again, which is what the reference needs.
    if (await keyedByFieldId(knex)) {
      logging.info(`Rebuilding ${VALUES} keyed by field key`);
      await rebuild(knex, KEY_SHAPE);
    }

    if (await knex.schema.hasColumn(FIELDS, 'namespace')) {
      logging.info(`Dropping ${FIELDS}.namespace`);
      await commands.dropColumn(FIELDS, 'namespace', knex);
    }
  },
);
