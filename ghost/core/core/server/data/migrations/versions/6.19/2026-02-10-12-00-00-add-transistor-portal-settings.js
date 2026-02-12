const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const ObjectID = require('bson-objectid').default;

module.exports = createTransactionalMigration(
    async function up(knex) {
        // transistor_portal_enabled
        const enabledExists = await knex('settings').where('key', 'transistor_portal_enabled').first();
        if (enabledExists) {
            logging.warn('Skipping adding setting: transistor_portal_enabled - already exists');
        } else {
            logging.info('Adding setting: transistor_portal_enabled');
            await knex('settings').insert({
                id: (new ObjectID()).toHexString(),
                key: 'transistor_portal_enabled',
                value: 'true',
                type: 'boolean',
                group: 'transistor',
                flags: 'PUBLIC',
                created_at: knex.raw('current_timestamp')
            });
        }

        // transistor_portal_heading
        const headingExists = await knex('settings').where('key', 'transistor_portal_heading').first();
        if (headingExists) {
            logging.warn('Skipping adding setting: transistor_portal_heading - already exists');
        } else {
            logging.info('Adding setting: transistor_portal_heading');
            await knex('settings').insert({
                id: (new ObjectID()).toHexString(),
                key: 'transistor_portal_heading',
                value: 'Podcasts',
                type: 'string',
                group: 'transistor',
                flags: 'PUBLIC',
                created_at: knex.raw('current_timestamp')
            });
        }

        // transistor_portal_description
        const descriptionExists = await knex('settings').where('key', 'transistor_portal_description').first();
        if (descriptionExists) {
            logging.warn('Skipping adding setting: transistor_portal_description - already exists');
        } else {
            logging.info('Adding setting: transistor_portal_description');
            await knex('settings').insert({
                id: (new ObjectID()).toHexString(),
                key: 'transistor_portal_description',
                value: 'Access your RSS feeds',
                type: 'string',
                group: 'transistor',
                flags: 'PUBLIC',
                created_at: knex.raw('current_timestamp')
            });
        }

        // transistor_portal_button_text
        const buttonTextExists = await knex('settings').where('key', 'transistor_portal_button_text').first();
        if (buttonTextExists) {
            logging.warn('Skipping adding setting: transistor_portal_button_text - already exists');
        } else {
            logging.info('Adding setting: transistor_portal_button_text');
            await knex('settings').insert({
                id: (new ObjectID()).toHexString(),
                key: 'transistor_portal_button_text',
                value: 'Manage',
                type: 'string',
                group: 'transistor',
                flags: 'PUBLIC',
                created_at: knex.raw('current_timestamp')
            });
        }

        // transistor_portal_url_template
        const urlTemplateExists = await knex('settings').where('key', 'transistor_portal_url_template').first();
        if (urlTemplateExists) {
            logging.warn('Skipping adding setting: transistor_portal_url_template - already exists');
        } else {
            logging.info('Adding setting: transistor_portal_url_template');
            await knex('settings').insert({
                id: (new ObjectID()).toHexString(),
                key: 'transistor_portal_url_template',
                value: 'https://partner.transistor.fm/ghost/{memberUuid}',
                type: 'string',
                group: 'transistor',
                flags: 'PUBLIC',
                created_at: knex.raw('current_timestamp')
            });
        }
    },
    async function down(knex) {
        logging.info('Removing setting: transistor_portal_enabled');
        await knex('settings').where('key', 'transistor_portal_enabled').del();

        logging.info('Removing setting: transistor_portal_heading');
        await knex('settings').where('key', 'transistor_portal_heading').del();

        logging.info('Removing setting: transistor_portal_description');
        await knex('settings').where('key', 'transistor_portal_description').del();

        logging.info('Removing setting: transistor_portal_button_text');
        await knex('settings').where('key', 'transistor_portal_button_text').del();

        logging.info('Removing setting: transistor_portal_url_template');
        await knex('settings').where('key', 'transistor_portal_url_template').del();
    }
);
