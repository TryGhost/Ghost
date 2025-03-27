const {InternalServerError} = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Updating Admin API key for "Self-Serve Migration Integration"');

        const integration = await knex('integrations').where({
            slug: 'self-serve-migration',
            name: 'Self-Serve Migration Integration'
        }).first();

        if (!integration) {
            throw new InternalServerError({
                message: 'Could not find "Self-Serve Migration Integration"'
            });
        }

        const existingKey = await knex('api_keys').where({
            integration_id: integration.id,
            type: 'core'
        }).first();

        if (!existingKey) {
            logging.warn('Admin API key for "Self-Serve Migration Integration" with type "core" does not exists');
            return;
        }

        logging.info(`Updating API key type to "admin" for "Self-Serve Migration Integration" ${existingKey.id}`);
        await knex('api_keys')
            .update('type', 'admin')
            .where('id', existingKey.id);
    },
    async function down() {
        // noop as previous state was incorrect
    }
);
