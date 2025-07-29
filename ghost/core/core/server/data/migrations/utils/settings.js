const ObjectId = require('bson-objectid').default;
const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('./migrations');
const MIGRATION_USER = 1;

/**
 * Creates a migration which will insert a new setting in settings table
 * @param {object} settingSpec - setting type and group
 * @param {string} settingSpec.key - settings key
 * @param {*} settingSpec.value - settings value
 * @param {'array' | 'string' | 'number' | 'boolean' | 'object'} settingSpec.type - settings type
 * @param {string} settingSpec.group - settings group
 * @param {'PUBLIC' | 'RO' | 'PUBLIC,RO'} [settingSpec.flags] - settings flag
 * @returns {Object} migration object returning config/up/down properties
 */
function addSetting({key, value, type, group, flags = null}) {
    return createTransactionalMigration(
        async function up(connection) {
            const settingExists = await connection('settings')
                .where('key', '=', key)
                .first();
            if (settingExists) {
                logging.warn(`Skipping adding setting: ${key} - setting already exists`);
                return;
            }

            logging.info(`Adding setting: ${key}`);
            const now = connection.raw('CURRENT_TIMESTAMP');

            const data = {
                id: ObjectId().toHexString(),
                key,
                value,
                group,
                type,
                flags,
                created_at: now
            };

            if (await connection.schema.hasColumn('settings', 'created_by')) {
                data.created_by = MIGRATION_USER;
            }

            if (await connection.schema.hasColumn('settings', 'updated_by')) {
                data.updated_by = MIGRATION_USER;
            }

            return connection('settings').insert(data);
        },
        async function down(connection) {
            const settingExists = await connection('settings')
                .where('key', '=', key)
                .first();
            if (!settingExists) {
                logging.warn(`Skipping dropping setting: ${key} - setting does not exist`);
                return;
            }

            logging.info(`Dropping setting: ${key}`);
            return connection('settings')
                .where('key', '=', key)
                .del();
        }
    );
}

/**
 * @param {string} key - The key of the setting to remove
 * @returns {Object} - A migration object with up and down functions
 */
function removeSetting(key) {
    let originalSetting = null;

    return createTransactionalMigration(
        async function up(connection) {
            const settingExists = await connection('settings')
                .where('key', '=', key)
                .first();
            if (!settingExists) {
                logging.warn(`Skipping removing setting: ${key} - setting does not exist`);
                return;
            }

            // Store the original setting data for the down migration
            originalSetting = settingExists;

            logging.info(`Removing setting: ${key}`);
            return connection('settings')
                .where('key', '=', key)
                .del();
        },
        async function down(connection) {
            const settingExists = await connection('settings')
                .where('key', '=', key)
                .first();
            if (settingExists) {
                logging.warn(`Skipping restoring setting: ${key} - setting already exists`);
                return;
            }

            if (!originalSetting) {
                logging.warn(`Skipping restoring setting: ${key} - no original setting data found`);
                return;
            }

            logging.info(`Restoring setting: ${key}`);
            const now = connection.raw('CURRENT_TIMESTAMP');

            const data = {
                id: ObjectId().toHexString(),
                key,
                value: originalSetting.value,
                group: originalSetting.group,
                type: originalSetting.type,
                flags: originalSetting.flags,
                created_at: now
            };

            if (await connection.schema.hasColumn('settings', 'created_by')) {
                data.created_by = MIGRATION_USER;
            }

            if (await connection.schema.hasColumn('settings', 'updated_by')) {
                data.updated_by = MIGRATION_USER;
            }

            return connection('settings')
                .insert(data);
        }
    );
}

module.exports = {
    addSetting,
    removeSetting
};
