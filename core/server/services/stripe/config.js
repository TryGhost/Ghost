const ghostVersion = require('@tryghost/version');

module.exports = {
    getConfig(settings, config) {
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
        return {
            secretKey: keys.secretKey,
            publicKey: keys.publicKey,
            appInfo: {
                name: 'Ghost',
                partner_id: 'pp_partner_DKmRVtTs4j9pwZ',
                version: ghostVersion.original,
                url: 'https://ghost.org/'
            },
            enablePromoCodes: config.get('enableStripePromoCodes')
        };
    }
};
