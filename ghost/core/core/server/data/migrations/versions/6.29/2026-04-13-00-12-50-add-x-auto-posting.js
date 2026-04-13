const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid').default;
const {combineNonTransactionalMigrations, createAddColumnMigration, createNonTransactionalMigration} = require('../../utils');

const X_SETTINGS = [
    {
        key: 'x_access_token',
        value: null,
        type: 'string',
        group: 'x'
    },
    {
        key: 'x_access_token_secret',
        value: null,
        type: 'string',
        group: 'x'
    },
    {
        key: 'x_user_id',
        value: null,
        type: 'string',
        group: 'x'
    },
    {
        key: 'x_username',
        value: null,
        type: 'string',
        group: 'x'
    }
];

const addXSettingsMigration = createNonTransactionalMigration(
    async function up(connection) {
        for (const setting of X_SETTINGS) {
            const existingSetting = await connection('settings')
                .where('key', '=', setting.key)
                .first();

            if (existingSetting) {
                logging.warn(`Skipping adding setting: ${setting.key} - setting already exists`);
                continue;
            }

            logging.info(`Adding setting: ${setting.key}`);
            await connection('settings').insert({
                id: ObjectId().toHexString(),
                key: setting.key,
                value: setting.value,
                group: setting.group,
                type: setting.type,
                flags: null,
                created_at: connection.raw('CURRENT_TIMESTAMP')
            });
        }
    },
    async function down(connection) {
        for (const setting of X_SETTINGS.slice().reverse()) {
            const existingSetting = await connection('settings')
                .where('key', '=', setting.key)
                .first();

            if (!existingSetting) {
                logging.warn(`Skipping dropping setting: ${setting.key} - setting does not exist`);
                continue;
            }

            logging.info(`Dropping setting: ${setting.key}`);
            await connection('settings')
                .where('key', '=', setting.key)
                .del();
        }
    }
);

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('posts_meta', 'x_post_enabled', {
        type: 'boolean',
        nullable: false,
        defaultTo: true
    }),
    addXSettingsMigration
);
