const logging = require('@tryghost/logging');

module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        const defaultValue = {
            provider: 'mailgun',
            apiKey: null,
            domain: null,
            baseUrl: null
        };
        const bulkEmailSettingsJSON = await knex('settings').where({
            key: 'bulk_email_settings'
        }).select().first();

        let bulkEmailSettings;
        try {
            bulkEmailSettings = JSON.parse(bulkEmailSettingsJSON.value) || defaultValue;
        } catch (err) {
            logging.warn(`Error parsing bulk_email_settings JSON. Using defaults`);
            bulkEmailSettings = defaultValue;
        }

        const operations = [{
            key: 'mailgun_api_key',
            value: bulkEmailSettings.apiKey
        }, {
            key: 'mailgun_domain',
            value: bulkEmailSettings.domain
        }, {
            key: 'mailgun_base_url',
            value: bulkEmailSettings.baseUrl
        }];

        // eslint-disable-next-line no-restricted-syntax
        for (const operation of operations) {
            logging.info(`Updating ${operation.key} setting's value, group, type & flags.`);
            await knex('settings')
                .where({
                    key: operation.key
                })
                .update({
                    group: 'email',
                    type: 'string',
                    flags: null,
                    value: operation.value
                });
        }
    },

    async down({transacting: knex}) {
        const settingsToDelete = [
            'mailgun_api_key',
            'mailgun_domain',
            'mailgun_base_url'
        ];

        logging.info(`Deleting settings: ${settingsToDelete.join(', ')}`);

        await knex('settings').whereIn('key', settingsToDelete).del();
    }
};
