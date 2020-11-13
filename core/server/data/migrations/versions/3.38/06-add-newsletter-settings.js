const logging = require('../../../../../shared/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(

    async function up(connection) {
        logging.info('Updating newsletter settings -  newsletter_show_badge, newsletter_show_header, newsletter_body_font_category, newsletter_footer_content - to newsletter group');
        await connection('settings')
            .whereIn('key', ['newsletter_show_badge', 'newsletter_show_header', 'newsletter_body_font_category', 'newsletter_footer_content'])
            .update({
                group: 'newsletter'
            });
    },

    async function down() {}
);
