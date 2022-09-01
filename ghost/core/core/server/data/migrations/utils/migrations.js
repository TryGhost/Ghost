const errors = require('@tryghost/errors');

/**
 * @param {(connection: import('knex').Knex) => Promise<void>} up
 * @param {(connection: import('knex').Knex) => Promise<void>} down
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
 * @param {(connection: import('knex').Knex) => Promise<void>} up
 *
 * @returns {Migration}
 */
function createIrreversibleMigration(up) {
    return {
        config: {
            irreversible: true
        },
        async up(config) {
            await up(config.connection);
        },
        async down() {
            return Promise.reject();
        }
    };
}

/**
 * @param {(connection: import('knex').Knex) => Promise<void>} up
 * @param {(connection: import('knex').Knex) => Promise<void>} down
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

/**
 * @param {Migration[]} migrations
 *
 * @returns {Migration}
 */
function combineNonTransactionalMigrations(...migrations) {
    return {
        config: {
            transaction: false
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

/**
 * @param {number} major
 */
function createFinalMigration(major) {
    return createTransactionalMigration(
        async function up() {
            throw new errors.InternalServerError({
                message: `Unable to run migrations`,
                context: `You must be on the latest v${major}.x to update across major versions - https://ghost.org/docs/update/`,
                help: `Run 'ghost update v${major}' to get the latest v${major}.x version, then run 'ghost update' to get to the latest.`
            });
        },
        async function down() {
            // no-op
        });
}

module.exports = {
    createFinalMigration,
    createTransactionalMigration,
    createNonTransactionalMigration,
    createIrreversibleMigration,
    combineTransactionalMigrations,
    combineNonTransactionalMigrations
};

/**
 * @typedef {Object} TransactionalMigrationFunctionOptions
 *
 * @prop {import('knex').Knex} transacting
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
