const logging = require('../../../../../shared/logging');

module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        logging.info('Updating newsletter settings -  newsletter_show_badge, newsletter_show_header, newsletter_body_font_category - to newsletter group');
        await knex('settings')
            .whereIn('key', ['newsletter_show_badge', 'newsletter_show_header', 'newsletter_body_font_category'])
            .update({
                group: 'newsletter'
            });
    },

    async down() {}
};