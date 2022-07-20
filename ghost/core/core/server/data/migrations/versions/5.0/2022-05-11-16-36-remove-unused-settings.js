const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

const settingsToRemove = [
    'editor_is_launch_complete',
    'members_free_price_name',
    'members_free_price_description',
    'members_paid_signup_redirect',
    'members_free_signup_redirect',
    'members_from_address',
    'members_reply_address',
    'stripe_product_name',
    'newsletter_show_badge',
    'newsletter_header_image',
    'newsletter_show_header_icon',
    'newsletter_show_header_title',
    'newsletter_title_alignment',
    'newsletter_title_font_category',
    'newsletter_show_feature_image',
    'newsletter_body_font_category',
    'newsletter_footer_content',
    'oauth_client_id',
    'oauth_client_secret'
];

// Settings that cannot be removed, but should not be used anymore
// 'members_monthly_price_id',
// 'members_yearly_price_id',
// 'portal_products',
// 'stripe_plans'

module.exports = createTransactionalMigration(
    async function up(knex) {
        const existingSettings = await knex('settings')
            .whereIn('key', settingsToRemove)
            .pluck('key');

        const settingsInDatabase = settingsToRemove.filter(s => existingSettings.includes(s));
        if (settingsInDatabase.length) {
            logging.info(`Deleting settings: ${settingsInDatabase.join(', ')}`);
            await knex('settings')
                .whereIn('key', settingsInDatabase)
                .del();
        }

        const settingsNotInDatabase = settingsToRemove.filter(s => !existingSettings.includes(s));
        if (settingsNotInDatabase.length) {
            logging.warn(`Unable to delete missing settings: ${settingsNotInDatabase.join(', ')}`);
        }
    },
    async function down() {
        // no-op: we don't want to recreate these settings without values
    }
);
