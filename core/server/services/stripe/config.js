const logging = require('@tryghost/logging');
const tpl = require('@tryghost/tpl');

const messages = {
    remoteWebhooksInDevelopment: 'Cannot use remote webhooks in development. See https://ghost.org/docs/webhooks/#stripe-webhooks for developing with Stripe.'
};

// @TODO Refactor to a class w/ constructor
module.exports = {
    getConfig(settings, config, urlUtils) {
        /**
         * @param {'direct' | 'connect'} type - The "type" of keys to fetch from settings
         * @returns {{publicKey: string, secretKey: string} | null}
         */
        function getStripeKeys(type) {
            const secretKey = settings.get(`stripe_${type === 'connect' ? 'connect_' : ''}secret_key`);
            const publicKey = settings.get(`stripe_${type === 'connect' ? 'connect_' : ''}publishable_key`);

            if (!secretKey || !publicKey) {
                return null;
            }

            return {
                secretKey,
                publicKey
            };
        }

        /**
         * @returns {{publicKey: string, secretKey: string} | null}
         */
        function getActiveStripeKeys() {
            const stripeDirect = config.get('stripeDirect');

            if (stripeDirect) {
                return getStripeKeys('direct');
            }

            const connectKeys = getStripeKeys('connect');

            if (!connectKeys) {
                return getStripeKeys('direct');
            }

            return connectKeys;
        }
        const keys = getActiveStripeKeys();
        if (!keys) {
            return null;
        }

        const env = config.get('env');
        let webhookSecret = process.env.WEBHOOK_SECRET;

        if (env !== 'production') {
            if (!webhookSecret) {
                webhookSecret = 'DEFAULT_WEBHOOK_SECRET';
                logging.warn(tpl(messages.remoteWebhooksInDevelopment));
            }
        }

        const webhookHandlerUrl = new URL('members/webhooks/stripe/', urlUtils.getSiteUrl());

        return {
            secretKey: keys.secretKey,
            publicKey: keys.publicKey,
            enablePromoCodes: config.get('enableStripePromoCodes'),
            webhookSecret: webhookSecret,
            webhookHandlerUrl: webhookHandlerUrl.href
        };
    }
};
