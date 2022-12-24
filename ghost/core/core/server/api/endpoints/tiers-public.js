const tiersService = require('../../services/tiers');
const settingsHelpers = require('../../services/settings-helpers');

module.exports = {
    docName: 'tiers',

    browse: {
        options: [
            'limit',
            'fields',
            'filter',
            'order',
            'debug',
            'page'
        ],
        permissions: true,
        async query(frame) {
            const page = await tiersService.api.browse(settingsHelpers.isStripeConnected(), frame.options);

            return page;
        }
    }
};
