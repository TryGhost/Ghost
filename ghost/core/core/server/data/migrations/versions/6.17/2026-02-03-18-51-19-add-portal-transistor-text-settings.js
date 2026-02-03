const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'portal_transistor_heading',
        value: 'Podcasts',
        type: 'string',
        group: 'portal'
    }),
    addSetting({
        key: 'portal_transistor_description',
        value: 'Access your private podcasts',
        type: 'string',
        group: 'portal'
    }),
    addSetting({
        key: 'portal_transistor_button_text',
        value: 'Subscribe',
        type: 'string',
        group: 'portal'
    })
);
