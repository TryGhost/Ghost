const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const ObjectID = require('bson-objectid').default;

const SETTINGS = [
    {
        key: 'transistor_portal_enabled',
        value: 'true',
        type: 'boolean',
        group: 'transistor',
        flags: 'PUBLIC'
    },
    {
        key: 'transistor_portal_heading',
        value: 'Podcasts',
        type: 'string',
        group: 'transistor',
        flags: 'PUBLIC'
    },
    {
        key: 'transistor_portal_description',
        value: 'Access your RSS feeds',
        type: 'string',
        group: 'transistor',
        flags: 'PUBLIC'
    },
    {
        key: 'transistor_portal_button_text',
        value: 'Manage',
        type: 'string',
        group: 'transistor',
        flags: 'PUBLIC'
    },
    {
        key: 'transistor_portal_url_template',
        value: 'https://partner.transistor.fm/ghost/{memberUuid}',
        type: 'string',
        group: 'transistor',
        flags: 'PUBLIC'
    }
];

module.exports = createTransactionalMigration(
    async function up(knex) {
        for (const setting of SETTINGS) {
            const existing = await knex('settings')
                .where('key', setting.key)
                .first();

            if (existing) {
                logging.warn(`Skipping adding setting: ${setting.key} - already exists`);
                continue;
            }

            logging.info(`Adding setting: ${setting.key}`);
            await knex('settings').insert({
                id: (new ObjectID()).toHexString(),
                key: setting.key,
                value: setting.value,
                type: setting.type,
                group: setting.group,
                flags: setting.flags,
                created_at: knex.raw('current_timestamp')
            });
        }
    },
    async function down(knex) {
        for (const setting of SETTINGS) {
            logging.info(`Removing setting: ${setting.key}`);
            await knex('settings')
                .where('key', setting.key)
                .del();
        }
    }
);
