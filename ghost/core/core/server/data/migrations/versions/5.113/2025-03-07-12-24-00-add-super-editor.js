const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration, meta} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Creating "Super Editor" role');
        const existingRole = await knex('roles').where({
            name: 'Super Editor'
        }).first();

        if (existingRole) {
            logging.warn('"Super Editor" role already exists, skipping');
            return;
        }

        await knex('roles').insert({
            id: (new ObjectID()).toHexString(),
            name: 'Super Editor',
            description: 'Editor plus member management',
            created_by: meta.MIGRATION_USER,
            created_at: knex.raw('current_timestamp')
        });
    },
    async function down(knex) {
        logging.info('Deleting role "Super Editor"');
        await knex('roles').where({
            name: 'Super Editor'
        }).del();
    }
);