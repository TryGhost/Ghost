const ObjectId = require('bson-objectid');
const logging = require('@tryghost/logging');

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        const settingsKeys = ['force_i18n', 'permalinks', 'members_session_secret'];

        logging.info(`Removing ${settingsKeys.join(',')} from "settings" table.`);

        return await options
            .transacting('settings')
            .whereIn('key', settingsKeys)
            .del();
    },

    async down(options) {
        const currentTimestamp = options.transacting.raw('CURRENT_TIMESTAMP');

        const forceI18nSetting = {
            id: ObjectId().toHexString(),
            key: 'force_i18n',
            value: 'true',
            type: 'blog',
            created_at: currentTimestamp,
            created_by: 1,
            updated_at: currentTimestamp,
            updated_by: 1
        };

        const permalinksSetting = {
            id: ObjectId().toHexString(),
            key: 'permalinks',
            value: '/:slug/',
            type: 'blog',
            created_at: currentTimestamp,
            created_by: 1,
            updated_at: currentTimestamp,
            updated_by: 1
        };

        const membersSessionSecretSetting = {
            id: ObjectId().toHexString(),
            key: 'members_session_secret',
            value: null,
            type: 'members',
            created_at: currentTimestamp,
            created_by: 1,
            updated_at: currentTimestamp,
            updated_by: 1
        };

        logging.info('Adding force_i18n, permalinks, and members_session_secret to "settings" table.');

        return options.transacting('settings')
            .insert([
                forceI18nSetting,
                permalinksSetting,
                membersSessionSecretSetting
            ]);
    }
};
