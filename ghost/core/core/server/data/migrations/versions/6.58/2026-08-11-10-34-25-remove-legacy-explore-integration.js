const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

const INTEGRATION_SLUG = 'ghost-explore';
const ROLE_NAME = 'Ghost Explore Integration';
const PERMISSION_NAME = 'Read explore data';

async function removeIntegration(knex) {
    const integration = await knex('integrations').select('id').where('slug', INTEGRATION_SLUG).first();

    if (!integration) {
        logging.warn(`Skipping removal of ${INTEGRATION_SLUG} integration - it does not exist`);
        return;
    }

    await knex('api_keys').where('integration_id', integration.id).del();
    await knex('integrations').where('id', integration.id).del();
    logging.info(`Removed ${INTEGRATION_SLUG} integration and API keys`);
}

async function removePermission(knex) {
    const permission = await knex('permissions').select('id').where('name', PERMISSION_NAME).first();

    if (!permission) {
        logging.warn(`Skipping removal of ${PERMISSION_NAME} permission - it does not exist`);
        return;
    }

    await knex('permissions_roles').where('permission_id', permission.id).del();
    await knex('permissions_users').where('permission_id', permission.id).del();
    await knex('permissions').where('id', permission.id).del();
    logging.info(`Removed ${PERMISSION_NAME} permission`);
}

async function removeRole(knex) {
    const role = await knex('roles').select('id').where('name', ROLE_NAME).first();

    if (!role) {
        logging.warn(`Skipping removal of ${ROLE_NAME} role - it does not exist`);
        return;
    }

    await knex('api_keys').where('role_id', role.id).del();
    await knex('permissions_roles').where('role_id', role.id).del();
    await knex('roles_users').where('role_id', role.id).del();
    await knex('roles').where('id', role.id).del();
    logging.info(`Removed ${ROLE_NAME} role`);
}

module.exports = createTransactionalMigration(
    async function up(knex) {
        await removeIntegration(knex);
        await removePermission(knex);
        await removeRole(knex);
    },
    async function down() {
        logging.warn('Skipping restoration of the legacy Ghost Explore integration because its API key cannot be recovered');
    }
);
