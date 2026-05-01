const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'threads',
        value: null,
        type: 'string',
        group: 'site',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'bluesky',
        value: null,
        type: 'string',
        group: 'site',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'mastodon',
        value: null,
        type: 'string',
        group: 'site',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'tiktok',
        value: null,
        type: 'string',
        group: 'site',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'youtube',
        value: null,
        type: 'string',
        group: 'site',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'instagram',
        value: null,
        type: 'string',
        group: 'site',
        flags: 'PUBLIC'
    }),
    addSetting({
        key: 'linkedin',
        value: null,
        type: 'string',
        group: 'site',
        flags: 'PUBLIC'
    })
);
