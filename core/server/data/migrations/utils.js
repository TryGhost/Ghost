const ObjectId = require('bson-objectid').default;
const logging = require('../../../shared/logging');
const commands = require('../schema').commands;

const MIGRATION_USER = 1;

/**
 * Creates a migrations which will add a new table from schema.js to the database
 */
function addTable(name) {
    return createNonTransactionalMigration(
        async function up(connection) {
            const tableExists = await connection.schema.hasTable(name);
            if (tableExists) {
                logging.warn(`Skipping adding table: ${name} - table already exists`);
                return;
            }

            logging.info(`Adding table: ${name}`);
            return commands.createTable(name, connection);
        },
        async function down(connection) {
            const tableExists = await connection.schema.hasTable(name);
            if (!tableExists) {
                logging.warn(`Skipping dropping table: ${name} - table does not exist`);
                return;
            }

            logging.info(`Dropping table: ${name}`);
            return commands.deleteTable(name, connection);
        }
    );
}

/**
 * Creates a migration which will add a permission to the database
 *
 * @param {Object} config
 * @param {string} config.name - The name of the permission
 * @param {string} config.action - The action_type of the permission
 * @param {string} config.object - The object_type of the permission
 *
 * @returns {Migration}
 */
function addPermission(config) {
    return createTransactionalMigration(
        async function up(connection) {
            const existingPermission = await connection('permissions').where({
                name: config.name,
                action_type: config.action,
                object_type: config.object
            }).first();

            if (existingPermission) {
                logging.warn(`Permission for ${config.action}:${config.object} already added`);
                return;
            }

            logging.info(`Adding permission for ${config.action}:${config.object}`);

            const date = connection.raw('CURRENT_TIMESTAMP');

            await connection('permissions').insert({
                id: ObjectId.generate(),
                name: config.name,
                action_type: config.action,
                object_type: config.object,
                created_at: date,
                created_by: MIGRATION_USER,
                updated_at: date,
                updated_by: MIGRATION_USER
            });
        },
        async function down(connection) {
            const existingPermission = await connection('permissions').where({
                name: config.name,
                action_type: config.action,
                object_type: config.object
            }).first();

            if (!existingPermission) {
                logging.warn(`Permission for ${config.action}:${config.object} already removed`);
                return;
            }

            logging.info(`Removing permission for ${config.action}:${config.object}`);

            await connection('permissions').where({
                action_type: config.action,
                object_type: config.object
            }).del();
        }
    );
}

/**
 * Creates a migration which will link a permission to a role in the database
 *
 * @param {Object} config
 * @param {string} config.permission - The name of the permission
 * @param {string} config.role - The name of the role
 *
 * @returns {Migration}
 */
function addPermissionToRole(config) {
    return createTransactionalMigration(
        async function up(connection) {
            const permission = await connection('permissions').where({
                name: config.permission
            }).first();

            if (!permission) {
                throw new Error(
                    `Cannot add permission(${config.permission}) to role(${config.role}) - permission does not exist`
                );
            }

            const role = await connection('roles').where({
                name: config.role
            }).first();

            if (!role) {
                throw new Error(
                    `Cannot add permission(${config.permission}) to role(${config.role}) - role does not exist`
                );
            }

            const existingRelation = await connection('permissions_roles').where({
                permission_id: permission.id,
                role_id: role.id
            }).first();

            if (existingRelation) {
                logging.warn(`Adding permission(${config.permission}) to role(${config.role}) - already exists`);
                return;
            }

            logging.warn(`Adding permission(${config.permission}) to role(${config.role})`);
            await connection('permissions_roles').insert({
                id: ObjectId.generate(),
                permission_id: permission.id,
                role_id: role.id
            });
        },
        async function down(connection) {
            const permission = await connection('permissions').where({
                name: config.permission
            }).first();

            if (!permission) {
                throw new Error(
                    `Cannot remove permission(${config.permission}) from role(${config.role}) - permission does not exist`
                );
            }

            const role = await connection('roles').where({
                name: config.role
            }).first();

            if (!role) {
                throw new Error(
                    `Cannot remove permission(${config.permission}) from role(${config.role}) - role does not exist`
                );
            }

            const existingRelation = await connection('permissions_roles').where({
                permission_id: permission.id,
                role_id: role.id
            }).first();

            if (!existingRelation) {
                logging.warn(`Removing permission(${config.permission}) from role(${config.role}) - already removed`);
                return;
            }

            logging.info(`Removing permission(${config.permission}) from role(${config.role})`);
            await connection('permissions_roles').where({
                permission_id: permission.id,
                role_id: role.id
            }).del();
        }
    );
}

/**
 * Creates a migration which will add a permission to the database, and then link it to roles
 *
 * @param {Object} config
 * @param {string} config.name - The name of the permission
 * @param {string} config.action - The action_type of the permission
 * @param {string} config.object - The object_type of the permission
 *
 * @param {string[]} roles - A list of role names
 *
 * @returns {Migration}
 */
function addPermissionWithRoles(config, roles) {
    return combineTransactionalMigrations(
        addPermission(config),
        ...roles.map((role => addPermissionToRole({permission: config.name, role})))
    );
}

/**
 * @param {(connection: import('knex')) => Promise<void>} up
 * @param {(connection: import('knex')) => Promise<void>} down
 *
 * @returns {Migration}
 */
function createNonTransactionalMigration(up, down) {
    return {
        config: {
            transaction: false
        },
        async up(config) {
            await up(config.connection);
        },
        async down(config) {
            await down(config.connection);
        }
    };
}

/**
 * @param {(connection: import('knex')) => Promise<void>} up
 * @param {(connection: import('knex')) => Promise<void>} down
 *
 * @returns {Migration}
 */
function createTransactionalMigration(up, down) {
    return {
        config: {
            transaction: true
        },
        async up(config) {
            await up(config.transacting);
        },
        async down(config) {
            await down(config.transacting);
        }
    };
}

/**
 * @param {Migration[]} migrations
 *
 * @returns {Migration}
 */
function combineTransactionalMigrations(...migrations) {
    return {
        config: {
            transaction: true
        },
        async up(config) {
            for (const migration of migrations) {
                await migration.up(config);
            }
        },
        async down(config) {
            // Down migrations must be run backwards!!
            const reverseMigrations = migrations.slice().reverse();
            for (const migration of reverseMigrations) {
                await migration.down(config);
            }
        }
    };
}

module.exports = {
    addTable,
    addPermission,
    addPermissionToRole,
    addPermissionWithRoles,
    createTransactionalMigration,
    createNonTransactionalMigration,
    combineTransactionalMigrations,
    meta: {
        MIGRATION_USER
    }
};

/**
 * @typedef {Object} TransactionalMigrationFunctionOptions
 *
 * @prop {import('knex')} transacting
 */

/**
 * @typedef {(options: TransactionalMigrationFunctionOptions) => Promise<void>} TransactionalMigrationFunction
 */

/**
 * @typedef {Object} Migration
 *
 * @prop {Object} config
 * @prop {boolean} config.transaction
 *
 * @prop {TransactionalMigrationFunction} up
 * @prop {TransactionalMigrationFunction} down
 */
