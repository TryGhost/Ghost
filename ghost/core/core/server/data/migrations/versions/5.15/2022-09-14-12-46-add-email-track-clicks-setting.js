const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid').default;
const {createTransactionalMigration} = require('../../utils');

const {MIGRATION_USER} = require('../../utils/constants');
const key = 'email_track_clicks';
const cloneValueOf = 'email_track_opens';
const defaultValue = 'true';
const group = 'email';
const type = 'boolean';

// Note: we cannot use the addSetting helper here because we need to base the value on the current value of email_track_opens
module.exports = createTransactionalMigration(
    async function up(connection) {
        const settingExists = await connection('settings')
            .where('key', '=', key)
            .first();
        if (settingExists) {
            logging.warn(`Skipping adding setting: ${key} - setting already exists`);
            return;
        }

        // Value is based on the email_track_opens value
        const reuseValueOfSetting = await connection('settings')
            .where('key', '=', cloneValueOf)
            .first();

        logging.info(`Adding setting: ${key}`);
        const now = connection.raw('CURRENT_TIMESTAMP');

        return connection('settings')
            .insert({
                id: ObjectId().toHexString(),
                key,
                value: reuseValueOfSetting ? reuseValueOfSetting.value : defaultValue,
                group,
                type,
                created_at: now,
                created_by: MIGRATION_USER,
                updated_at: now,
                updated_by: MIGRATION_USER
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
