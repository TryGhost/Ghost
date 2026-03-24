const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration} = require('../../utils');

const DEFAULT_TEMPLATE_SLUG = 'default';

module.exports = createTransactionalMigration(
    async function up(knex) {
        const existing = await knex('email_templates')
            .where({slug: DEFAULT_TEMPLATE_SLUG})
            .first();

        if (existing) {
            logging.warn('Default email template already exists, skipping');
            return;
        }

        const templateId = (new ObjectID()).toHexString();

        logging.info('Creating default email template');
        await knex('email_templates').insert({
            id: templateId,
            name: 'Default',
            slug: DEFAULT_TEMPLATE_SLUG,
            created_at: knex.raw('current_timestamp')
        });

        logging.info('Linking existing automated emails to default template');
        await knex('automated_emails')
            .whereNull('email_template_id')
            .update({email_template_id: templateId});
    },
    async function down(knex) {
        logging.info('Unlinking automated emails from default template');
        await knex('automated_emails')
            .update({email_template_id: null});

        logging.info('Deleting default email template');
        await knex('email_templates')
            .where({slug: DEFAULT_TEMPLATE_SLUG})
            .del();
    }
);
