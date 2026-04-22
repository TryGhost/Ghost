const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'transistor_portal_enabled',
        value: 'true',
        type: 'boolean',
        group: 'transistor',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'transistor_portal_heading',
        value: 'Podcasts',
        type: 'string',
        group: 'transistor',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'transistor_portal_description',
        value: 'Access your private podcast feed',
        type: 'string',
        group: 'transistor',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'transistor_portal_button_text',
        value: 'View',
        type: 'string',
        group: 'transistor',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'transistor_portal_url_template',
        value: 'https://partner.transistor.fm/ghost/{memberUuid}',
        type: 'string',
        group: 'transistor',
        flags: 'PUBLIC'
    })
);
