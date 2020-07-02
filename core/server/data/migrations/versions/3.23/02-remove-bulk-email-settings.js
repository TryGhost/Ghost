const logging = require('../../../../../shared/logging');
const ObjectId = require('bson-objectid').default;

module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        logging.info(`Deleting bulk_email_settings setting`);

        await knex('settings').where({
            key: 'bulk_email_settings'
        }).del();
    },

    async down({transacting: knex}) {
        const getSetting = key => knex.select('value').from('settings').where('key', key).first();

        const apiKey = await getSetting('mailgun_api_key');
        const domain = await getSetting('mailgun_domain');
        const baseUrl = await getSetting('mailgun_base_url');

        const bulkEmailSettings = {
            provider: 'mailgun',
            apiKey: apiKey ? apiKey.value : '',
            domain: domain ? domain.value : '',
            baseUrl: baseUrl ? baseUrl.value : ''
        };

        const now = knex.raw('CURRENT_TIMESTAMP');

        logging.info(`Restoring bulk_email_settings setting from mailgun settings`);
        await knex('settings')
            .insert({
                id: ObjectId.generate(),
                key: 'bulk_email_settings',
                value: JSON.stringify(bulkEmailSettings),
                group: 'email',
                type: 'object',
                flags: '',
                created_at: now,
                created_by: 1,
                updated_at: now,
                updated_by: 1
            });
    }
};
