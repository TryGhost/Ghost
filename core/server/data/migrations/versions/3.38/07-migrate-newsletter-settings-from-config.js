const {createTransactionalMigration} = require('../../utils');
const config = require('../../../../../shared/config');
const logging = require('../../../../../shared/logging');

module.exports = createTransactionalMigration(
    async function up(connection) {
        const emailTemplateConfig = config.get('members:emailTemplate');

        logging.info('Updating newsletter_show_header setting from members.emailTemplate.showSiteHeader config');
        await connection('settings')
            .update({
                value: emailTemplateConfig.showSiteHeader ? 'true' : 'false'
            })
            .where({
                key: 'newsletter_show_header'
            });

        logging.info('Updating newsletter_show_badge setting from members.emailTemplate.showPoweredBy config');
        await connection('settings')
            .update({
                value: emailTemplateConfig.showPoweredBy ? 'true' : 'false'
            })
            .where({
                key: 'newsletter_show_badge'
            });
    },

    async function down(connection) {
        logging.info('Updating newsletter_show_header setting to default "true"');
        await connection('settings')
            .update({
                value: 'true'
            })
            .where({
                key: 'newsletter_show_header'
            });

        logging.info('Updating newsletter_show_badge setting to default "false"');
        await connection('settings')
            .update({
                value: 'true'
            })
            .where({
                key: 'newsletter_show_badge'
            });
    }
);

