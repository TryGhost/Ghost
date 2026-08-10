const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

const FIELDS_TABLE = 'members_custom_fields';
const VALUES_TABLE = 'members_custom_field_values';

// A key is minted once and never changes, so a definition created before this release
// keeps its hyphens for good. Those definitions are discarded rather than rewritten:
// custom fields sit behind a private flag and have never been released, so only a site
// deliberately opted in can hold one, and re-creating a field re-mints its key.
//
// Only hyphenated keys go. A single-word key was already what this release would mint,
// so it and its values are left alone.
//
// Values are deleted explicitly rather than left to the foreign key: it cascades on
// MySQL, but SQLite only enforces one when `foreign_keys` is on, which knex-migrator
// does not guarantee.
module.exports = createTransactionalMigration(
    async function up(knex) {
        // `-` carries no special meaning in a LIKE pattern, unlike `_` and `%`.
        const ids = await knex(FIELDS_TABLE).where('key', 'like', '%-%').pluck('id');

        if (ids.length === 0) {
            logging.info('No custom field definitions with hyphenated keys to discard');
            return;
        }

        const discardedValues = await knex(VALUES_TABLE).whereIn('custom_field_id', ids).del();
        const discardedFields = await knex(FIELDS_TABLE).whereIn('id', ids).del();

        logging.info(`Discarded ${discardedFields} custom field definition(s) with hyphenated keys, and ${discardedValues} value(s)`);
    },
    async function down() {
        // Nothing to undo: an underscored key is a key the previous release can read and
        // address, it is only one it would not have minted.
        logging.info('Leaving underscored custom field keys in place: the previous release reads them unchanged');
    }
);
