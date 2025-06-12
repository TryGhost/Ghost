const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'threads',
        value: '',
        type: 'string',
        group: 'site'
    }),
    addSetting({
        key: 'bluesky',
        value: '',
        type: 'string',
        group: 'site'
    }),
    addSetting({
        key: 'mastodon',
        value: '',
        type: 'string',
        group: 'site'
    }),
    addSetting({
        key: 'tiktok',
        value: '',
        type: 'string',
        group: 'site'
    }),
    addSetting({
        key: 'youtube',
        value: '',
        type: 'string',
        group: 'site'
    }),
    addSetting({
        key: 'instagram',
        value: '',
        type: 'string',
        group: 'site'
    }),
    addSetting({
        key: 'linkedin',
        value: '',
        type: 'string',
        group: 'site'
    })
); 