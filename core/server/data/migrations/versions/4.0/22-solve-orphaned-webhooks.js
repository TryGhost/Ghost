const {createIrreversibleMigration} = require('../../utils');
const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid');
const crypto = require('crypto');

// createSecret is copied from core/server/models/api-key.js
const createSecret = (type) => {
    const bytes = type === 'content' ? 13 : 32;
    return crypto.randomBytes(bytes).toString('hex');
};

module.exports = createIrreversibleMigration(
    async function up(knex) {
        logging.info('Resolving the orphaned webhooks');

        const orphanedWebhooks = await knex('webhooks')
            .select('webhooks.id')
            .leftJoin('integrations', 'integrations.id', 'webhooks.integration_id')
            .where('integrations.id', null);

        if (orphanedWebhooks.length === 0) {
            logging.info('No orphaned webhooks found, skipping');
            return;
        }

        const [role] = await knex('roles')
            .select('roles.id')
            .where('name', 'Admin Integration');

        if (!role) {
            logging.warn('Failed to apply migration because of missing role.');
            return;
        }

        const now = knex.raw('CURRENT_TIMESTAMP');
        const id = ObjectID().toHexString();

        const integration = {
            id: id,
            type: 'custom',
            name: `Legacy webhooks`,
            slug: `legacy-webhooks-${id}`,
            icon_image: null,
            description: `This integration was created as part of the 4.0 migration. It contains all webhooks created via the API that weren't visible in the admin interface previously.`,
            created_at: now,
            created_by: 1,
            updated_at: now,
            updated_by: 1
        };

        await knex('integrations')
            .insert(integration);

        const contentKey = {
            id: ObjectID().toHexString(),
            type: 'content',
            secret: createSecret('content'),
            role_id: null,
            integration_id: integration.id,
            created_at: now,
            created_by: 1,
            updated_at: now,
            updated_by: 1
        };
        await knex('api_keys').insert(contentKey);

        const adminKey = {
            id: ObjectID().toHexString(),
            type: 'admin',
            secret: createSecret('admin'),
            role_id: role.id,
            integration_id: integration.id,
            created_at: now,
            created_by: 1,
            updated_at: now,
            updated_by: 1
        };
        await knex('api_keys').insert(adminKey);

        // eslint-disable-next-line no-restricted-syntax
        for (let i = 0; i < orphanedWebhooks.length; i++) {
            const webhook = orphanedWebhooks[i];

            await knex('webhooks')
                .update({
                    integration_id: integration.id
                })
                .where({
                    id: webhook.id
                });
        }
    }
);
