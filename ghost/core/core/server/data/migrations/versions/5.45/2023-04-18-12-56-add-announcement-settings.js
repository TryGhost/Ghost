const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'announcement_content',
        value: null,
        type: 'string',
        flags: 'PUBLIC',
        group: 'announcement'
    }),
    addSetting({
        key: 'announcement_background',
        value: 'dark',
        type: 'string',
        flags: 'PUBLIC',
        group: 'announcement'
    })
);
