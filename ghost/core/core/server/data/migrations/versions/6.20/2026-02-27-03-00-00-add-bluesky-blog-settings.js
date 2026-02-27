const {combineTransactionalMigrations, addSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'bluesky_blog_handle',
        value: '',
        type: 'string',
        group: 'members'
    }),
    addSetting({
        key: 'bluesky_blog_did',
        value: '',
        type: 'string',
        group: 'members'
    }),
    addSetting({
        key: 'bluesky_blog_app_password',
        value: '',
        type: 'string',
        group: 'members'
    }),
    addSetting({
        key: 'bluesky_comment_sync_enabled',
        value: 'false',
        type: 'boolean',
        group: 'members'
    })
);
