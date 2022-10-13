const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const ObjectId = require('bson-objectid').default;

module.exports = createTransactionalMigration(
    async function up(connection) {
        const oldSetting = await connection('settings')
            .where('key', 'members_allow_free_signup')
            .select('value', 'created_by', 'updated_by')
            .first();

        // no need to create new setting in this case, Ghost will create through default settings
        if (!oldSetting) {
            logging.warn('Could not find setting `members_allow_free_signup`, skipping update of `members_signup_access` setting');
            return;
        }

        const newSetting = await connection('settings')
            .where('key', 'members_signup_access')
            .select('value')
            .first();

        const migrateValue = oldSetting.value === 'true' ? 'all' : 'invite';

        if (newSetting) {
            // new setting already exists, *update* with migrated value
            logging.info('Updating `members_signup_access` setting with value from `members_allow_free_signup`');
            await connection('settings')
                .where('key', 'members_signup_access')
                .update('value', migrateValue);
        } else {
            // setting does not exist yet, *create* with migrated value
            logging.info('Creating `members_signup_access` setting with value from `members_allow_free_signup`');

            const currentTimestamp = connection.raw('CURRENT_TIMESTAMP');

            const newSettingData = {
                id: ObjectId().toHexString(),
                group: 'members',
                key: 'members_signup_access',
                value: migrateValue,
                type: 'string',
                created_at: currentTimestamp,
                updated_at: currentTimestamp,
                created_by: oldSetting.created_by,
                updated_by: oldSetting.updated_by
            };

            await connection('settings').insert(newSettingData);
        }

        logging.info('Deleting `members_allow_free_signup` setting');
        await connection('settings')
            .where('key', 'members_allow_free_signup')
            .del();
    },

    async function down(connection) {
        const newSetting = await connection('settings')
            .where('key', 'members_signup_access')
            .select('value', 'created_by', 'updated_by')
            .first();

        const oldSetting = await connection('settings')
            .where('key', 'members_allow_free_signup')
            .select('value')
            .first();

        // if newSetting doesn't exist then the old setting still exists and will be used,
        // or it will be created with defaults on next Ghost boot
        if (!newSetting) {
            logging.warn('Could not find setting `members_signup_access`, skipping rollback of `members_allow_free_signup` setting');
            return;
        }

        // this can potentially be lossy if going from "nobody" but it matches to the
        // most appropriate setting available in earlier versions of Ghost
        const rollbackValue = newSetting.value === 'all' ? 'true' : 'false';

        if (oldSetting) {
            logging.info('Updating `members_allow_free_signup` based on value from `members_signup_access`');
            await connection('settings')
                .where('key', 'members_allow_free_signup')
                .update('value', rollbackValue);
        } else {
            logging.info('Creating `members_allow_free_signup` based on value from `members_signup_access`');

            const currentTimestamp = connection.raw('CURRENT_TIMESTAMP');

            await connection('settings')
                .insert({
                    id: ObjectId().toHexString(),
                    key: 'members_allow_free_signup',
                    group: 'members',
                    type: 'boolean',
                    value: rollbackValue,
                    created_at: currentTimestamp,
                    updated_at: currentTimestamp,
                    created_by: newSetting.created_by,
                    updated_by: newSetting.updated_by
                });
        }

        logging.info('Deleting `members_signup_access` setting');
        await connection('settings')
            .where('key', 'members_signup_access')
            .del();
    }
);
