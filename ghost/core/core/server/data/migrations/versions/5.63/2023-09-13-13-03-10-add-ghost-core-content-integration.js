// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration} = require('../../utils');

const MIGRATION_USER = 1;

const coreContentIntegration = {
    slug: 'ghost-core-content',
    name: 'Ghost Core Content API',
    description: 'Internal Content API integration for Admin access',
    type: 'core'
};

const addIntegration = async (knex, integration) => {
    const message = `Adding "${integration.name}" integration`;

    const existing = await knex('integrations').select('id').where('slug', integration.slug).first();

    if (existing?.id) {
        logging.warn(`Skipping ${message} - already exists`);
        return;
    }

    logging.info(message);

    const now = knex.raw('CURRENT_TIMESTAMP');
    integration.id = (new ObjectID()).toHexString();
    integration.created_at = now;
    integration.created_by = MIGRATION_USER;

    await knex('integrations').insert(integration);
};

const removeIntegration = async (knex, integration) => {
    const message = `Removing ${integration.name} integration`;

    const existing = await knex('integrations').select('id').where('slug', integration.slug).first();

    if (!existing?.id) {
        logging.warn(`Skipping ${message} - doesn't exist`);
        return;
    }

    logging.info(message);

    await knex('api_keys').where('integration_id', existing.id).del();
    await knex('integrations').where('id', existing.id).del();
};

module.exports = createTransactionalMigration(
    async function up(knex) {
        await addIntegration(knex, coreContentIntegration);
    },
    async function down(knex) {
        await removeIntegration(knex, coreContentIntegration);
    }
);
