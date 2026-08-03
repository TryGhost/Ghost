const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addColumn, dropColumn, addUnique, dropUnique, addIndex, dropIndex} = require('../../../schema/commands');

const TABLE = 'members_custom_field_values';

// Named rather than derived: knex would build the name from the table and all three
// columns, which comes to 65 characters, and MySQL stops at 64.
const LEAF_UNIQUE = 'members_custom_field_values_leaf_unique';

// A composite value used to live in one row as a JSON blob. It now occupies one row per
// part, keyed by `path`, so a part can be read, written and — the reason for the change —
// indexed on its own.
//
// Stored values are discarded rather than converted. Custom fields are behind a private
// flag and have never been released, so no site can hold a value except by having been
// opted in deliberately, while a conversion step would run on every Ghost database that
// exists for as long as this migration does. Carrying data-moving code across all of them
// to serve the handful of installs that could have data is the wrong side of that trade,
// and rolling back already discards composites for want of a catalog this cannot read —
// so discarding in both directions is at least the same answer twice.
async function discardStoredValues(knex) {
    const discarded = await knex(TABLE).del();
    if (discarded > 0) {
        logging.warn(`Discarded ${discarded} custom field value(s): the storage format changed before the feature was released`);
    }
}

// Column changes ask for `auto` so MySQL picks an in-place algorithm where it can; the
// helpers otherwise default to a full table copy, which blocks writes.
//
// Both foreign keys on this table need an index, and MySQL refuses to drop the last one
// serving either. It counts an index whose leftmost column is the referencing column, so
// the order of these steps matters: the replacement has to exist before the thing it
// replaces goes. SQLite has no such rule, which is why this only bites on MySQL.
// Every step is written to be safe to repeat. This migration is not transactional, so a
// crash part-way leaves the table half-changed with nothing recorded as done — and
// knex-migrator will run it again on the next boot. The constraint and index helpers
// already swallow "it is already there"; the column steps have to ask.
module.exports = createNonTransactionalMigration(
    async function up(knex) {
        // First, so that every later step works on an empty table: nothing can collide
        // with the new constraint, and no row has to be read, decoded or rewritten.
        await discardStoredValues(knex);

        if (!await knex.schema.hasColumn(TABLE, 'path')) {
            await addColumn(TABLE, 'path', knex, undefined, {algorithm: 'auto'});
        }

        // Added before the old constraint is dropped, so `member_id` stays leftmost and
        // covers that foreign key the moment it exists.
        await addUnique(TABLE, ['member_id', 'custom_field_id', 'path'], knex, LEAF_UNIQUE);
        await dropUnique(TABLE, ['member_id', 'custom_field_id'], knex);

        if (await knex.schema.hasColumn(TABLE, 'value_json')) {
            await dropColumn(TABLE, 'value_json', knex, {}, {algorithm: 'auto'});
        }
        await addIndex(TABLE, ['custom_field_id', 'path'], knex);

        // Only present if this migration has been rolled back and re-applied: `down` adds
        // it so MySQL keeps an index over the foreign key while the composite one goes.
        // The composite covers that key again now, so the standalone one would be drift
        // against a fresh install.
        await dropIndex(TABLE, ['custom_field_id'], knex);
    },
    async function down(knex) {
        // Same reasoning in reverse, and the same first step: a value is one row per part
        // now, and putting the parts back together would need the field-type catalog this
        // deliberately does not read.
        await discardStoredValues(knex);

        await addUnique(TABLE, ['member_id', 'custom_field_id'], knex);
        await dropUnique(TABLE, ['member_id', 'custom_field_id', 'path'], knex, LEAF_UNIQUE);

        // `custom_field_id` needs its own index back before the composite one goes, or
        // MySQL is left with nothing covering that foreign key and refuses the drop.
        await addIndex(TABLE, ['custom_field_id'], knex);
        await dropIndex(TABLE, ['custom_field_id', 'path'], knex);

        if (!await knex.schema.hasColumn(TABLE, 'value_json')) {
            await addColumn(TABLE, 'value_json', knex, {type: 'text', maxlength: 65535, nullable: true}, {algorithm: 'auto'});
        }
        if (await knex.schema.hasColumn(TABLE, 'path')) {
            await dropColumn(TABLE, 'path', knex, {}, {algorithm: 'auto'});
        }
    }
);
