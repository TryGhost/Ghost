const ObjectId = require('bson-objectid').default;
const logging = require('@tryghost/logging');

const { createTransactionalMigration } = require('./migrations');
const MIGRATION_USER = 1;

/**
 * @param {import('knex').Knex} connection
 * @param {RoleConfig} config
 */
async function addRoleHelper(connection, config) {
  const existingRole = await connection('roles').where({ name: config.name }).first();

  if (existingRole) {
    logging.warn(`Skipping adding role: ${config.name} - role already exists`);
    return;
  }

  logging.info(`Adding role: ${config.name}`);

  const now = connection.raw('CURRENT_TIMESTAMP');
  const data = {
    id: ObjectId().toHexString(),
    ...config,
    created_at: now,
    updated_at: now,
  };

  if (await connection.schema.hasColumn('roles', 'created_by')) {
    data.created_by = MIGRATION_USER;
  }

  if (await connection.schema.hasColumn('roles', 'updated_by')) {
    data.updated_by = MIGRATION_USER;
  }

  await connection('roles').insert(data);
}

/**
 * @param {import('knex').Knex} connection
 * @param {RoleConfig} config
 */
async function removeRoleHelper(connection, config) {
  const existingRole = await connection('roles').where({ name: config.name }).first();

  if (!existingRole) {
    logging.warn(`Skipping removing role: ${config.name} - role does not exist`);
    return;
  }

  logging.info(`Removing role: ${config.name}`);

  await connection('api_keys').where('role_id', existingRole.id).del();
  await connection('permissions_roles').where('role_id', existingRole.id).del();
  await connection('roles_users').where('role_id', existingRole.id).del();
  await connection('roles').where('id', existingRole.id).del();
}

/**
 * Creates a migration which adds a role to the database
 *
 * @param {RoleConfig} config
 * @returns {Migration}
 */
function addRole(config) {
  return createTransactionalMigration(
    async function up(connection) {
      await addRoleHelper(connection, config);
    },
    async function down(connection) {
      await removeRoleHelper(connection, config);
    },
  );
}

/**
 * Creates a migration which removes a role from the database
 *
 * Role assignments and API keys are removed with the role and cannot be restored.
 *
 * @param {RoleConfig} config
 * @returns {Migration}
 */
function removeRole(config) {
  return createTransactionalMigration(
    async function up(connection) {
      await removeRoleHelper(connection, config);
    },
    async function down(connection) {
      await addRoleHelper(connection, config);
    },
  );
}

module.exports = {
  addRole,
  removeRole,
};

/**
 * @typedef {Object} RoleConfig
 * @prop {string} config.name
 * @prop {string} [config.description]
 */
