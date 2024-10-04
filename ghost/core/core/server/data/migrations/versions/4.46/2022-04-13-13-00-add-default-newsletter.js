const ObjectId = require('bson-objectid').default;
const crypto = require('crypto');
const logging = require('@tryghost/logging');
const startsWith = require('lodash/startsWith');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        // This uses the default settings from core/server/data/schema/default-settings/default-settings.json
        const newsletter = {
            id: (new ObjectId()).toHexString(),
            uuid: crypto.randomUUID(),
            name: 'Ghost',
            description: '',
            slug: 'default-newsletter',
            sender_name: null,
            sender_email: null,
            sender_reply_to: 'newsletter',
            status: 'active',
            visibility: 'members',
            subscribe_on_signup: true,
            sort_order: 0,
            body_font_category: 'sans_serif',
            footer_content: '',
            header_image: null,
            show_badge: true,
            show_feature_image: true,
            show_header_icon: true,
            show_header_title: true,
            show_header_name: false,
            title_alignment: 'center',
            title_font_category: 'sans_serif',
            created_at: knex.raw('CURRENT_TIMESTAMP')
        };

        // Make sure the newsletter table is empty
        const newsletters = await knex('newsletters').count('*', {as: 'total'});

        if (newsletters[0].total !== 0) {
            logging.warn('Skipping adding the default newsletter - There is already at least one newsletter');
            return;
        }

        // Get all settings in one query
        const settings = await knex('settings')
            .whereIn('key', [
                'title',
                'description',
                'newsletter_body_font_category',
                'newsletter_footer_content',
                'newsletter_header_image',
                'newsletter_show_badge',
                'newsletter_show_feature_image',
                'newsletter_show_header_icon',
                'newsletter_show_header_title',
                'newsletter_title_alignment',
                'newsletter_title_font_category'
            ])
            .select(['key', 'value']);

        // eslint-disable-next-line no-restricted-syntax
        for (let {key, value} of settings) {
            // Use site title for the newsletter name
            if (key === 'title') {
                key = 'name';
            }
            // Settings have a `newsletter_` prefix which isn't present on the newsletters table
            if (startsWith(key, 'newsletter_')) {
                key = key.slice(11);
            }

            if (value === null && ['name', 'body_font_category', 'show_badge', 'show_feature_image', 'show_header_icon', 'show_header_title', 'title_alignment', 'title_font_category'].includes(key)) {
                // Prevent setting null to non-nullable columns
                // Default to defaults above in that case
                continue;
            }

            if (typeof newsletter[key] === 'boolean') {
                newsletter[key] = value === 'true';
            } else {
                newsletter[key] = value;
            }
        }

        logging.info('Adding the default newsletter');
        await knex('newsletters').insert(newsletter);
    },
    async function down(knex) {
        logging.info(`Removing newsletters`);
        await knex('newsletters').delete();
    }
);
