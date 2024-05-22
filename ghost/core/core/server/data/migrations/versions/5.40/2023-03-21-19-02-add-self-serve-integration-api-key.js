const {InternalServerError} = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const security = require('@tryghost/security');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration, meta} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Adding Admin API key for "Self-Serve Migration Integration"');

        const integration = await knex('integrations').where({
            slug: 'self-serve-migration',
            name: 'Self-Serve Migration Integration'
        }).first();

        if (!integration) {
            throw new InternalServerError({
                message: 'Could not find "Self-Serve Migration Integration"'
            });
        }

        const role = await knex('roles').where({
            name: 'Self-Serve Migration Integration'
        }).first();

        if (!role) {
            throw new InternalServerError({
                message: 'Could not find "Self-Serve Migration Integration" Role'
            });
        }

        const existingKey = await knex('api_keys').where({
            integration_id: integration.id,
            role_id: role.id
        }).first();

        if (existingKey) {
            logging.warn('Admin API key for "Self-Serve Migration Integration" already exists');
            return;
        }

        await knex('api_keys').insert({
            id: (new ObjectID()).toHexString(),
            type: 'admin',
            secret: security.secret.create('admin'),
            role_id: role.id,
            integration_id: integration.id,
            created_at: knex.raw('current_timestamp'),
            created_by: meta.MIGRATION_USER
        });
    },
    async function down(knex) {
        logging.info('Removing "Self-Serve Migration Integration" API key');

        const integration = await knex('integrations').where({
            slug: 'self-serve-migration',
            type: 'core',
            name: 'Self-Serve Migration Integration'
        }).first();

        const role = await knex('roles').where({
            name: 'Self-Serve Migration Integration'
        }).first();

        if (!role || !integration) {
            logging.warn('Could not delete "Self-Serve Migration Integration" API key');
            return;
        }

        logging.info('Deleting "Self-Serve Migration Integration" API Key');
        await knex('api_keys').where({
            integration_id: integration.id,
            role_id: role.id
        }).del();
    }
);
