// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const {InternalServerError} = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const security = require('@tryghost/security');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration, meta} = require('../../utils');

const coreContentIntegration = {
    slug: 'ghost-core-content',
    name: 'Ghost Core Content API',
    description: 'Internal Content API integration for Admin access',
    type: 'core'
};

const addIntegrationContentKey = async (knex, integration) => {
    const message = `Adding "${integration.name}" integration content key`;

    const existingIntegration = await knex('integrations').select('id').where({
        slug: integration.slug
    }).first();

    if (!existingIntegration) {
        throw new InternalServerError({
            message: `Could not find "${integration.name}" integration`
        });
    }

    const existing = await knex('api_keys').select('id')
        .where('integration_id', existingIntegration.id)
        .where('type', 'content')
        .first();

    if (existing?.id) {
        logging.warn(`Skipping ${message} - already exists`);
        return;
    }

    logging.info(message);

    await knex('api_keys').insert({
        id: (new ObjectID()).toHexString(),
        type: 'content',
        secret: security.secret.create('content'),
        role_id: null,
        integration_id: existingIntegration.id,
        created_at: knex.raw('current_timestamp'),
        created_by: meta.MIGRATION_USER
    });
};

const removeIntegrationContentKey = async (knex, integration) => {
    const message = `Removing "${integration.name}" integration content key`;

    const existingIntegration = await knex('integrations').select('id').where({
        slug: integration.slug
    }).first();

    if (!existingIntegration?.id) {
        logging.warn(`Skipping ${message} - integration does not exist`);
        return;
    }

    const existing = await knex('api_keys').select('id').where({
        integration_id: existingIntegration.id,
        type: 'content'
    }).first();

    if (!existing?.id) {
        logging.warn(`Skipping ${message} - content key does not exist`);
        return;
    }

    logging.info(message);

    await knex('api_keys').where('id', existing.id).del();
};

module.exports = createTransactionalMigration(
    async function up(knex) {
        await addIntegrationContentKey(knex, coreContentIntegration);
    },

    async function down(knex) {
        await removeIntegrationContentKey(knex, coreContentIntegration);
    }
);
