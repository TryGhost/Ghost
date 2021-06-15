const logging = require('@tryghost/logging');

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        // update portal button setting to false
        logging.info(`Updating portal button setting to false`);
        return await options
            .transacting('settings')
            .where('key', 'portal_button')
            .update({
                value: 'false'
            });
    },

    // `up` is only run to fix previously set default value for portal button,
    // it doesn't make sense to be revert it back as `true` as feature is still behind dev flag
    async down() {
        return Promise.resolve();
    }
};
