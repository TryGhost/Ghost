const ObjectId = require('bson-objectid');
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const {slugify} = require('@tryghost/string');

// This contains the default settings from core/server/data/schema/default-settings/default-settings.json
// This is needed to avoid an edge case where this migration runs before the settings are populated
const defaultSettings = {
    newsletter_show_badge: 'true',
    newsletter_header_image: null,
    newsletter_show_header_icon: 'true',
    newsletter_show_header_title: 'true',
    newsletter_title_alignment: 'center',
    newsletter_title_font_category: 'sans_serif',
    newsletter_show_feature_image: 'true',
    newsletter_body_font_category: 'sans_serif',
    newsletter_footer_content: ''
};

module.exports = createTransactionalMigration(
    async function up(knex) {
        // Make sure the newsletter table is empty
        const newsletters = await knex('newsletters').count('*', {as: 'total'});

        if (newsletters[0].total !== 0) {
            logging.info('Skipping adding the default newsletter - There is already at least one newsletter');
            return;
        }

        /**
         * Helper to return a setting or a default value
         */
        async function getSetting(name, defaultValue) {
            const setting = await knex('settings')
                .where('key', name)
                .select(['value'])
                .first();

            if (setting) {
                return setting.value;
            } else if (Object.hasOwnProperty.call(defaultSettings, name)) {
                return defaultSettings[name];
            }

            return defaultValue;
        }

        const title = await getSetting('title', 'Ghost');
        const newsletter = {
            id: ObjectId().toHexString(),
            name: title,
            description: await getSetting('description', ''),
            slug: slugify(title),
            sender_name: title,
            sender_email: null,
            sender_reply_to: 'newsletter',
            status: 'active',
            visibility: 'members',
            subscribe_on_signup: true,
            sort_order: 0
        };

        const designSettings = ['header_image', 'show_header_icon', 'show_header_title', 'title_font_category', 'title_alignment', 'show_feature_image', 'body_font_category', 'footer_content', 'show_badge'];
        // eslint-disable-next-line no-restricted-syntax
        for (const setting of designSettings) {
            let value = await getSetting('newsletter_' + setting);
            if (['show_badge', 'show_feature_image', 'show_header_icon', 'show_header_title'].includes(setting)) {
                value = value === 'true';
            }
            newsletter[setting] = value;
        }

        logging.info('Adding the default newsletter');

        logging.info(knex('newsletters').insert(newsletter).toSQL().sql);
        logging.info(JSON.stringify(knex('newsletters').insert(newsletter).toSQL().bindings));

        await knex('newsletters').insert(newsletter);
    }, async function down() {
        // Noop because we don't want to reset the default newsletter values
        logging.info(`Skipping newsletter design settings backfill rollack - not needed`);
        return Promise.resolve();
    }
);
