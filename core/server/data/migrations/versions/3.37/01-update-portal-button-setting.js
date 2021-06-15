const logging = require('@tryghost/logging');
const config = require('../../../../../shared/config');

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        // update portal button setting to false
        const isPortalEnabled = config.get('portal');
        if (!isPortalEnabled) {
            logging.info(`Updating portal button setting to false`);
            return await options
                .transacting('settings')
                .where('key', 'portal_button')
                .update({
                    value: 'false'
                });
        }
        logging.info(`Portal is enabled, ignoring portal button update`);
        return Promise.resolve();
    },

    // `up` is only run to fix previously set default value for portal button,
    // it doesn't make sense to be revert it back as `true` as feature is still behind dev flag
    async down() {
        return Promise.resolve();
    }
};
