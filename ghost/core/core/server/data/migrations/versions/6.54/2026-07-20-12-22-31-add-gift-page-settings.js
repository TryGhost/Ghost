const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'gift_page_heading',
        value: null,
        type: 'string',
        group: 'gifts',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'gift_page_description',
        value: null,
        type: 'string',
        group: 'gifts',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'gift_page_image',
        value: null,
        type: 'string',
        group: 'gifts',
        flags: 'PUBLIC'
    })
);
