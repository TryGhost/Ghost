const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration} = require('../../utils');

const DEFAULT_SLUG = 'default-automated-email';

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Inserting default email_design_settings row');

        const existing = await knex('email_design_settings').where({slug: DEFAULT_SLUG}).first();

        if (existing) {
            logging.warn('Default email_design_settings row already exists, skipping');
            return;
        }

        await knex('email_design_settings').insert({
            id: (new ObjectID()).toHexString(),
            slug: DEFAULT_SLUG,
            background_color: 'light',
            header_background_color: 'transparent',
            show_header_title: true,
            button_color: 'accent',
            button_corners: 'rounded',
            button_style: 'fill',
            link_color: 'accent',
            link_style: 'underline',
            body_font_category: 'sans_serif',
            title_font_category: 'sans_serif',
            title_font_weight: 'bold',
            image_corners: 'square',
            show_badge: true,
            created_at: knex.raw('current_timestamp')
        });
    },
    async function down(knex) {
        logging.info('Deleting default email_design_settings row');

        await knex('email_design_settings').where({slug: DEFAULT_SLUG}).del();
    }
);
