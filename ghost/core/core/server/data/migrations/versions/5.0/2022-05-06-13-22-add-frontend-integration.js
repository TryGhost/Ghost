const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid').default;
const security = require('@tryghost/security');
const {createTransactionalMigration} = require('../../utils');

const frontendIntegration = {
    slug: 'ghost-internal-frontend',
    name: 'Ghost Internal Frontend',
    description: 'Internal frontend integration',
    type: 'internal'
};

const addInternalIntegrationAndKey = async (knex, integration) => {
    const message = `Adding ${integration.name} integration`;

    const existing = await knex('integrations').select('id').where('slug', integration.slug).first();

    if (existing && existing.id) {
        logging.warn(`Skipping ${message}`);
        return;
    }

    const now = knex.raw('CURRENT_TIMESTAMP');
    integration.id = ObjectID().toHexString();
    integration.created_at = now;
    integration.created_by = 1;

    await knex('integrations').insert(integration);

    const contentKey = {
        id: ObjectID().toHexString(),
        type: 'content',
        secret: security.secret.create('content'),
        role_id: null,
        integration_id: integration.id,
        created_at: now,
        created_by: 1
    };

    logging.info(message);

    await knex('api_keys').insert(contentKey);
};

const removeInternalIntegrationAndKey = async (knex, integration) => {
    const message = `Removing ${integration.name} integration`;

    const existing = await knex('integrations').select('id').where('slug', integration.slug).first();

    if (!existing) {
        logging.warn(`Skipping ${message}`);
        return;
    }

    logging.info(message);

    await knex('api_keys').where('integration_id', existing.id).delete();
    await knex('integrations').where('id', existing.id).delete();
};

module.exports = createTransactionalMigration(
    async function up(knex) {
        await addInternalIntegrationAndKey(knex, frontendIntegration);
    },
    async function down(knex) {
        await removeInternalIntegrationAndKey(knex, frontendIntegration);
    }
);
