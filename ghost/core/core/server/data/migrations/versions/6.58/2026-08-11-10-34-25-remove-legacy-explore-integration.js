const logging = require('@tryghost/logging');
const ObjectID = require('bson-objectid').default;
const {
    createTransactionalMigration,
    combineTransactionalMigrations,
    createRemovePermissionMigration
} = require('../../utils');

const INTEGRATION = {
    type: 'core',
    name: 'Ghost Explore',
    slug: 'ghost-explore',
    description: 'Built-in Ghost Explore integration'
};

const ROLE = {
    name: 'Ghost Explore Integration',
    description: 'Internal Integration for the Ghost Explore directory'
};

const PERMISSION = {
    name: 'Read explore data',
    action: 'read',
    object: 'explore'
};

// Mirrors the roles the permission was originally granted to in 5.3
const PERMISSION_ROLES = ['Administrator', 'Admin Integration', ROLE.name];

// `createRemovePermissionMigration` only unlinks the permission from roles, so any direct
// user grant would be left pointing at a deleted permission. Ghost only ever grants this
// via roles, so there is nothing to restore on the way back down.
const removeDirectUserGrants = createTransactionalMigration(
    async function up(knex) {
        const permission = await knex('permissions').where({
            name: PERMISSION.name,
            action_type: PERMISSION.action,
            object_type: PERMISSION.object
        }).first();

        if (!permission) {
            logging.warn(`Skipping cleanup of direct "${PERMISSION.name}" user grants - the permission does not exist`);
            return;
        }

        const removed = await knex('permissions_users').where('permission_id', permission.id).del();
        logging.info(`Removed ${removed} direct "${PERMISSION.name}" user grants`);
    },
    async function down() {
        logging.info(`Skipping restore of direct "${PERMISSION.name}" user grants - Ghost only grants it via roles`);
    }
);

const removeIntegration = createTransactionalMigration(
    async function up(knex) {
        const integration = await knex('integrations').select('id').where('slug', INTEGRATION.slug).first();

        if (!integration) {
            logging.warn(`Skipping removal of ${INTEGRATION.slug} integration - it does not exist`);
            return;
        }

        await knex('api_keys').where('integration_id', integration.id).del();
        await knex('integrations').where('id', integration.id).del();
        logging.info(`Removed ${INTEGRATION.slug} integration and API keys`);
    },
    async function down(knex) {
        const existing = await knex('integrations').select('id').where('slug', INTEGRATION.slug).first();

        if (existing) {
            logging.warn(`Skipping restore of ${INTEGRATION.slug} integration - it already exists`);
            return;
        }

        await knex('integrations').insert({
            id: new ObjectID().toHexString(),
            ...INTEGRATION,
            created_at: knex.raw('CURRENT_TIMESTAMP'),
            updated_at: knex.raw('CURRENT_TIMESTAMP')
        });

        // Deliberately no API key: the original secret is unrecoverable, and a rollback is
        // about getting the schema back to what the previous version expects rather than
        // reconnecting Explore - ghost.org stopped calling this endpoint long ago. Anyone
        // who needs Admin API access should create a custom integration instead.
        logging.info(`Restored ${INTEGRATION.slug} integration without an API key`);
    }
);

const removeRole = createTransactionalMigration(
    async function up(knex) {
        const role = await knex('roles').select('id').where('name', ROLE.name).first();

        if (!role) {
            logging.warn(`Skipping removal of ${ROLE.name} role - it does not exist`);
            return;
        }

        await knex('api_keys').where('role_id', role.id).del();
        await knex('permissions_roles').where('role_id', role.id).del();
        await knex('roles_users').where('role_id', role.id).del();
        await knex('roles').where('id', role.id).del();
        logging.info(`Removed ${ROLE.name} role`);
    },
    async function down(knex) {
        const existing = await knex('roles').select('id').where('name', ROLE.name).first();

        if (existing) {
            logging.warn(`Skipping restore of ${ROLE.name} role - it already exists`);
            return;
        }

        await knex('roles').insert({
            id: new ObjectID().toHexString(),
            ...ROLE,
            created_at: knex.raw('CURRENT_TIMESTAMP'),
            updated_at: knex.raw('CURRENT_TIMESTAMP')
        });

        logging.info(`Restored ${ROLE.name} role`);
    }
);

// Down migrations run in reverse, so the role is restored before the permission that has
// to be linked back to it
module.exports = combineTransactionalMigrations(
    removeDirectUserGrants,
    createRemovePermissionMigration(PERMISSION, PERMISSION_ROLES),
    removeIntegration,
    removeRole
);
