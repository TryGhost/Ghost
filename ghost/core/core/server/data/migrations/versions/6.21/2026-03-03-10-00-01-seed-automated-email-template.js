const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid').default;
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        const existing = await knex('email_templates').where('slug', 'automated-email').first();

        if (existing) {
            logging.info('Automated email template row already exists, skipping');
            return;
        }

        logging.info('Inserting default automated-email template row');

        await knex('email_templates').insert({
            id: ObjectId().toHexString(),
            slug: 'automated-email',
            background_color: 'light',
            header_background_color: 'transparent',
            header_image: null,
            show_header_title: false,
            footer_content: null,
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            body_font_category: 'sans_serif',
            section_title_color: null,
            button_color: 'accent',
            button_style: 'fill',
            button_corners: 'rounded',
            link_color: 'accent',
            link_style: 'underline',
            image_corners: 'square',
            divider_color: null,
            created_at: knex.raw('CURRENT_TIMESTAMP')
        });
    },
    async function down(knex) {
        logging.info('Removing default automated-email template row');
        await knex('email_templates').where('slug', 'automated-email').del();
    }
);
