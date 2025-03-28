const ObjectId = require('bson-objectid').default;
const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('./migrations');
const {MIGRATION_USER} = require('./constants');

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

            return connection('settings')
                .insert({
                    id: ObjectId().toHexString(),
                    key,
                    value,
                    group,
                    type,
                    flags,
                    created_at: now,
                    created_by: MIGRATION_USER
                });
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

module.exports = {
    addSetting
};
