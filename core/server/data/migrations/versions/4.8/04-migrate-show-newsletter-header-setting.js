const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const ObjectId = require('bson-objectid');

// newsletter_show_header = false ->
//   newsletter_show_header_title = false
//   newsletter_show_header_icon = false
//
// the default for both of the new settings is true so there's no need to migrate
// anything if previously showing the header

module.exports = createTransactionalMigration(
    async function up(connection) {
        const oldSetting = await connection('settings')
            .where('key', 'newsletter_show_header')
            .select(['value', 'created_by'])
            .first();

        if (!oldSetting) {
            logging.info('Skipping migration of newsletter_show_header setting. Does not exist');
            return;
        }

        if (oldSetting.value === 'false') {
            logging.info('Migrating newsletter_show_header setting. Disabling title and logo');

            const newSettingKeys = ['newsletter_show_header_title', 'newsletter_show_header_icon'];
            const now = connection.raw('CURRENT_TIMESTAMP');

            for (const settingKey of newSettingKeys) {
                const existingSetting = await connection('settings').where('key', settingKey).first();

                if (!existingSetting) {
                    // insert default setting - migrations are run before default settings are created
                    await connection('settings')
                        .insert({
                            id: ObjectId().toHexString(),
                            key: settingKey,
                            group: 'newsletter',
                            type: 'boolean',
                            value: 'true',
                            created_at: now,
                            updated_at: now,
                            created_by: oldSetting.created_by,
                            updated_by: oldSetting.created_by
                        });
                }
            }

            await connection('settings')
                .whereIn('key', ['newsletter_show_header_title', 'newsletter_show_header_icon'])
                .update({value: 'false'});
        } else {
            logging.info('Skipping migration of newsletter_show_header setting. Matches new defaults');
        }

        logging.info('Deleting newsletter_show_header setting');
        await connection('settings')
            .where('key', 'newsletter_show_header')
            .del();
    },

    async function down(connection) {
        logging.info('Adding newsletter_show_header setting');

        const oldSetting = await connection('settings')
            .where('key', '=', 'newsletter_show_header')
            .select('value')
            .first();

        const showTitle = await connection('settings')
            .where('key', '=', 'newsletter_show_header_title')
            .select(['value', 'created_by'])
            .first();

        const showIcon = await connection('settings')
            .where('key', '=', 'newsletter_show_header_icon')
            .select(['value', 'created_by'])
            .first();

        if (oldSetting) {
            logging.warn('Skipping rollback of newsletter_show_header setting. Already exists');
        } else {
            const [{id: ownerId} = {id: 1}] = await connection('users')
                .select('users.id')
                .innerJoin(
                    'roles_users',
                    'users.id',
                    'roles_users.user_id'
                )
                .where(
                    'roles_users.role_id',
                    connection('roles').select('id').where('name', 'Owner')
                );

            let showHeader = 'true'; // default

            if (showTitle && showIcon) {
                showHeader = showTitle.value === 'false' && showIcon.value === 'false' ? 'false' : 'true';
            }

            const now = connection.raw('CURRENT_TIMESTAMP');

            await connection('settings')
                .insert({
                    id: ObjectId().toHexString(),
                    key: 'newsletter_show_header',
                    group: 'newsletter',
                    type: 'boolean',
                    value: showHeader,
                    created_at: now,
                    updated_at: now,
                    created_by: ownerId,
                    updated_by: ownerId
                });
        }

        logging.info('Deleting newsletter_show_header_{title,icon} settings');
        await connection('settings')
            .whereIn('key', ['newsletter_show_header_title', 'newsletter_show_header_icon'])
            .del();
    }
);
