const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

const FIELDS_TABLE = 'members_custom_fields';
const VALUES_TABLE = 'members_custom_field_values';

// The shape this release mints: alphanumeric runs joined by single underscores, with no
// separator at either end. Written out here rather than imported from the service, so a
// later change to how keys are minted cannot change what this migration did.
const MINTED_KEY_SHAPE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

// A key naming an inherited property reads back as that property wherever a member's
// values are indexed, so it goes too, whatever its shape. Minting has refused these
// since 6.53, but the definitions endpoint shipped four days before that guard did.
const INHERITED_PROPERTY_NAMES = Object.getOwnPropertyNames(Object.prototype);

function isUnmintable(key) {
    return !MINTED_KEY_SHAPE.test(key) || INHERITED_PROPERTY_NAMES.includes(key);
}

// A key is minted once and never changes, so a definition created before this release
// keeps whatever shape it was given. Those definitions are discarded rather than
// rewritten: custom fields sit behind a private flag and have never been released, so
// only a site deliberately opted in can hold one, and re-creating a field re-mints it.
//
// Only the keys this release could not produce go. Hyphens are what changed, but they
// are not the whole set: the previous minting passed underscores through untouched, so
// a leading, trailing or doubled one survived it too.
//
// Every definition is read rather than filtered in SQL. The table is small, the rule is
// a regular expression neither engine agrees on, and `_` is a wildcard in LIKE, so the
// pattern that looks obvious is not the one that runs.
//
// Values are deleted explicitly rather than left to the foreign key: it cascades on
// MySQL, but SQLite only enforces one when `foreign_keys` is on, which knex-migrator
// does not guarantee.
module.exports = createTransactionalMigration(
    async function up(knex) {
        const definitions = await knex(FIELDS_TABLE).select('id', 'key');
        const discarded = definitions.filter(definition => isUnmintable(definition.key));

        if (discarded.length === 0) {
            logging.info('No custom field definitions to discard: every key is one this release can mint');
            return;
        }

        const ids = discarded.map(definition => definition.id);

        // A later 6.58 migration re-keys this table off `custom_field_id`. On the idempotency
        // re-run the column is gone, but so are these definitions (deleted on the first run,
        // and minting will not re-create them), so this branch is unreachable then. Guarding
        // on the column keeps the query shape-proof rather than erroring on a MySQL install.
        const hasFieldId = await knex.schema.hasColumn(VALUES_TABLE, 'custom_field_id');
        const discardedValues = hasFieldId
            ? await knex(VALUES_TABLE).whereIn('custom_field_id', ids).del()
            : 0;
        const discardedFields = await knex(FIELDS_TABLE).whereIn('id', ids).del();

        logging.info(`Discarded ${discardedFields} custom field definition(s) this release cannot mint, and ${discardedValues} value(s): ${discarded.map(definition => definition.key).join(', ')}`);
    },
    async function down() {
        // Nothing to undo: an underscored key is a key the previous release can read and
        // address, it is only one it would not have minted.
        logging.info('Leaving underscored custom field keys in place: the previous release reads them unchanged');
    }
);
