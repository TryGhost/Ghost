const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'paywall_heading_members',
        value: null,
        type: 'string',
        group: 'members'
    }),
    addSetting({
        key: 'paywall_heading_paid',
        value: null,
        type: 'string',
        group: 'members'
    }),
    addSetting({
        key: 'paywall_heading_tiers',
        value: null,
        type: 'string',
        group: 'members'
    }),
    addSetting({
        key: 'paywall_description',
        value: null,
        type: 'string',
        group: 'members'
    }),
    addSetting({
        key: 'paywall_button_text',
        value: null,
        type: 'string',
        group: 'members'
    }),
    addSetting({
        key: 'paywall_offer_code',
        value: null,
        type: 'string',
        group: 'members'
    })
);
