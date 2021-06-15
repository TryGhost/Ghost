const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid').default;

module.exports = {
    config: {
        transaction: true
    },

    async up(config) {
        const knex = config.transacting;

        const defaultOperations = [{
            key: 'members_from_address',
            flags: 'RO'
        }, {
            key: 'members_allow_free_signup'
        }, {
            key: 'stripe_product_name'
        }, {
            key: 'stripe_secret_key'
        }, {
            key: 'stripe_publishable_key'
        }, {
            key: 'stripe_plans'
        }];

        for (const operation of defaultOperations) {
            logging.info(`Updating ${operation.key} setting group,type,flags`);
            await knex('settings')
                .where({
                    key: operation.key
                })
                .update({
                    group: 'members',
                    type: 'members',
                    flags: operation.flags || ''
                });
        }

        const membersSubscriptionSettingsJSON = await knex('settings')
            .select('value')
            .where('key', 'members_subscription_settings')
            .first();

        if (!membersSubscriptionSettingsJSON || !membersSubscriptionSettingsJSON.value) {
            logging.warn(`Could not find members_subscription_settings - using default values`);
            return;
        }

        const membersSubscriptionSettings = JSON.parse(membersSubscriptionSettingsJSON.value);

        const membersFromAddress = typeof membersSubscriptionSettings.fromAddress === 'string' ? membersSubscriptionSettings.fromAddress : 'noreply';
        const membersAllowSelfSignup = typeof membersSubscriptionSettings.allowSelfSignup === 'boolean' ? membersSubscriptionSettings.allowSelfSignup : true;

        const stripe = membersSubscriptionSettings && membersSubscriptionSettings.paymentProcessors && membersSubscriptionSettings.paymentProcessors[0];

        const stripeConfig = stripe && stripe.config || {};

        const stripeDirectSecretKey = stripeConfig.secret_token || '';
        const stripeDirectPublishableKey = stripeConfig.public_token || '';
        const stripeProductName = stripeConfig.product && stripeConfig.product.name || 'Ghost Members';

        const stripePlans = (stripeConfig.plans || []).map((plan) => {
            return Object.assign(plan, {
                amount: plan.amount || 0
            });
        });

        const valueOperations = [{
            key: 'members_from_address',
            value: membersFromAddress
        }, {
            key: 'members_allow_free_signup',
            value: membersAllowSelfSignup.toString()
        }, {
            key: 'stripe_product_name',
            value: stripeProductName
        }, {
            key: 'stripe_secret_key',
            value: stripeDirectSecretKey
        }, {
            key: 'stripe_publishable_key',
            value: stripeDirectPublishableKey
        }, {
            key: 'stripe_plans',
            value: JSON.stringify(stripePlans)
        }];

        for (const operation of valueOperations) {
            logging.info(`Updating ${operation.key} setting value`);
            await knex('settings')
                .where({
                    key: operation.key
                })
                .update({
                    value: operation.value
                });
        }

        logging.info(`Deleting members_subscription_settings setting`);
        await knex('settings')
            .where('key', 'members_subscription_settings')
            .del();
    },

    async down(config) {
        const knex = config.transacting;

        const getSetting = key => knex.select('value').from('settings').where('key', key).first();

        const membersFromAddress = await getSetting('members_from_address');
        const allowSelfSignup = await getSetting('members_allow_free_signup');
        const stripeDirectSecretKey = await getSetting('stripe_secret_key');
        const stripeDirectPublishableKey = await getSetting('stripe_publishable_key');
        const stripeProductName = await getSetting('stripe_product_name');

        const stripePlans = await getSetting('stripe_plans');

        const allowSelfSignupBoolean = allowSelfSignup && allowSelfSignup.value === 'true';

        const membersSubscriptionSettings = {
            fromAddress: membersFromAddress ? membersFromAddress.value : 'noreply',
            allowSelfSignup: allowSelfSignupBoolean,
            paymentProcessors: [{
                adapter: 'stripe',
                config: {
                    secret_token: stripeDirectSecretKey ? stripeDirectSecretKey.value : null,
                    public_token: stripeDirectPublishableKey ? stripeDirectPublishableKey.value : null,
                    product: {
                        name: stripeProductName ? stripeProductName.value : 'Ghost Subscription'
                    },
                    plans: stripePlans ? JSON.parse(stripePlans.value) : [{
                        name: 'Monthly',
                        currency: 'usd',
                        interval: 'month',
                        amount: 500
                    }, {
                        name: 'Yearly',
                        currency: 'usd',
                        interval: 'year',
                        amount: 5000
                    }]
                }
            }]
        };

        const now = knex.raw('CURRENT_TIMESTAMP');

        logging.info(`Inserting members_subscription_settings setting`);
        await knex('settings')
            .insert({
                id: ObjectId().toHexString(),
                key: 'members_subscription_settings',
                value: JSON.stringify(membersSubscriptionSettings),
                group: 'members',
                type: 'members',
                flags: '',
                created_at: now,
                created_by: 1,
                updated_at: now,
                updated_by: 1
            });

        const settingsToDelete = [
            'members_from_address',
            'members_allow_free_signup',
            'stripe_plans',
            'stripe_product_name',
            'stripe_publishable_key',
            'stripe_secret_key'
        ];

        for (const setting of settingsToDelete) {
            logging.info(`Deleting ${setting} setting`);
        }
        await knex('settings').whereIn('key', settingsToDelete).del();
    }
};

