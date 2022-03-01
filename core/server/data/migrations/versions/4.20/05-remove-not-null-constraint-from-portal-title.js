const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addUnique} = require('../../../schema/commands');
const DatabaseInfo = require('@tryghost/database-info');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Dropping NOT NULL constraint for: portal_title in table: offers');

        await knex.schema.table('offers', function (table) {
            table.dropColumn('portal_title');
        });

        await knex.schema.table('offers', function (table) {
            table.string('portal_title', 191).nullable();
        });

        if (DatabaseInfo.isSQLite(knex)) {
            // eslint-disable-next-line no-restricted-syntax
            for (const column of ['name', 'code', 'stripe_coupon_id']) {
                await addUnique('offers', column, knex);
            }
        }
    },
    async function down(knex) {
        logging.info('Adding NOT NULL constraint for: portal_title in table: offers');

        await knex.schema.table('offers', function (table) {
            table.dropColumn('portal_title');
        });

        await knex.schema.table('offers', function (table) {
            table.string('portal_title', 191).notNullable();
        });

        if (DatabaseInfo.isSQLite(knex)) {
            // eslint-disable-next-line no-restricted-syntax
            for (const column of ['name', 'code', 'stripe_coupon_id']) {
                await addUnique('offers', column, knex);
            }
        }
    }
);

