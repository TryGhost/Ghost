const ObjectID = require('bson-objectid');
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils.js');

const MIGRATION_USER = 1;

module.exports = createTransactionalMigration(
    async function up(knex) {
        const labsExists = await knex('settings')
            .where('key', '=', 'labs')
            .first();

        if (!labsExists) {
            logging.info('Adding "labs" record to "settings" table');

            const now = knex.raw('CURRENT_TIMESTAMP');

            await knex('settings')
                .insert({
                    id: ObjectID().toHexString(),
                    key: 'labs',
                    value: JSON.stringify({}),
                    group: 'labs',
                    type: 'object',
                    created_at: now,
                    created_by: MIGRATION_USER,
                    updated_at: now,
                    updated_by: MIGRATION_USER
                });
        } else {
            logging.warn('Skipped adding "labs" record to "settings" table. Record already exists!');
        }
    },

    async function down(knex) {
        logging.info('Removing "labs" record from "settings" table');

        await knex('settings')
            .where('key', '=', 'labs')
            .del();
    }
);
