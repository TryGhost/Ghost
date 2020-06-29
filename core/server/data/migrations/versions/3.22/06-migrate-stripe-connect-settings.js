const logging = require('../../../../../shared/logging');
const ObjectId = require('bson-objectid').default;

module.exports = {
    config: {
        transaction: true
    },

    async up(config) {
        const knex = config.transacting;
        const stripeConnectIntegrationJSON = await knex('settings')
            .select('value')
            .where('key', 'stripe_connect_integration')
            .first();

        const stripeConnectIntegration = JSON.parse(stripeConnectIntegrationJSON.value);

        const operations = [{
            key: 'stripe_connect_publishable_key',
            value: stripeConnectIntegration.public_key || ''
        }, {
            key: 'stripe_connect_secret_key',
            value: stripeConnectIntegration.secret_key || ''
        }, {
            key: 'stripe_connect_livemode',
            value: stripeConnectIntegration.livemode || ''
        }, {
            key: 'stripe_connect_display_name',
            value: stripeConnectIntegration.display_name || ''
        }, {
            key: 'stripe_connect_account_id',
            value: stripeConnectIntegration.account_id || ''
        }];

        for (const operation of operations) {
            logging.info(`Updating ${operation.key} setting`);
            await knex('settings')
                .where({
                    key: operation.key
                })
                .update({
                    value: operation.value,
                    group: 'members',
                    flags: '',
                    type: 'members'
                });
        }

        logging.info(`Deleting stripe_connect_integration setting`);
        await knex('settings')
            .where('key', 'stripe_connect_integration')
            .del();
    },

    async down(config) {
        const knex = config.transacting;

        const getSetting = key => knex.select('value').from('settings').where('key', key).first();

        const accountId = await getSetting('stripe_connect_account_id');
        const displayName = await getSetting('stripe_connect_display_name');
        const livemode = await getSetting('stripe_connect_livemode');
        const publishableKey = await getSetting('stripe_connect_publishable_key');
        const secretKey = await getSetting('stripe_connect_secret_key');

        const stripeConnectIntegration = {
            account_id: accountId.value,
            display_name: displayName.value,
            livemode: livemode.value,
            public_key: publishableKey.value,
            secret_key: secretKey.value
        };

        const now = knex.raw('CURRENT_TIMESTAMP');

        logging.info(`Inserting stripe_connect_integration setting`);
        await knex('settings')
            .insert({
                id: ObjectId.generate(),
                key: 'stripe_connect_integration',
                value: JSON.stringify(stripeConnectIntegration),
                group: 'members',
                type: 'members',
                flags: '',
                created_at: now,
                created_by: 1,
                updated_at: now,
                updated_by: 1
            });

        const settingsToDelete = [
            'stripe_connect_account_id',
            'stripe_connect_display_name',
            'stripe_connect_livemode',
            'stripe_connect_publishable_key',
            'stripe_connect_secret_key'
        ];

        logging.info(`Deleting ${settingsToDelete.join(', ')} settings`);
        await knex('settings').whereIn('key', settingsToDelete).del();
    }
};

