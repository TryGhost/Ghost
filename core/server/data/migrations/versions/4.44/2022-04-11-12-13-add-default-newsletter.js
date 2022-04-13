const ObjectId = require('bson-objectid');
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const {slugify} = require('@tryghost/string');

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
            sender_email: title, //FIXME: the value should be null, this is only for a CI test as I can't reproduce the CI issue locally
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

        await knex('newsletters').insert(newsletter);
    }, async function down() {
        // Noop because we don't want to reset the default newsletter values
        logging.info(`Skipping newsletter design settings backfill rollack - not needed`);
        return Promise.resolve();
    }
);
