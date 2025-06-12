const {combineTransactionalMigrations, addSetting} = require('../../utils');
const logging = require('@tryghost/logging');

module.exports = combineTransactionalMigrations(
    addSetting({
        key: 'threads',
        value: '',
        type: 'string',
        group: 'site',
        onUp: () => logging.info('Adding threads social media setting'),
        onDown: () => logging.info('Removing threads social media setting')
    }),
    addSetting({
        key: 'bluesky',
        value: '',
        type: 'string',
        group: 'site',
        onUp: () => logging.info('Adding bluesky social media setting'),
        onDown: () => logging.info('Removing bluesky social media setting')
    }),
    addSetting({
        key: 'mastodon',
        value: '',
        type: 'string',
        group: 'site',
        onUp: () => logging.info('Adding mastodon social media setting'),
        onDown: () => logging.info('Removing mastodon social media setting')
    }),
    addSetting({
        key: 'tiktok',
        value: '',
        type: 'string',
        group: 'site',
        onUp: () => logging.info('Adding tiktok social media setting'),
        onDown: () => logging.info('Removing tiktok social media setting')
    }),
    addSetting({
        key: 'youtube',
        value: '',
        type: 'string',
        group: 'site',
        onUp: () => logging.info('Adding youtube social media setting'),
        onDown: () => logging.info('Removing youtube social media setting')
    }),
    addSetting({
        key: 'instagram',
        value: '',
        type: 'string',
        group: 'site',
        onUp: () => logging.info('Adding instagram social media setting'),
        onDown: () => logging.info('Removing instagram social media setting')
    }),
    addSetting({
        key: 'linkedin',
        value: '',
        type: 'string',
        group: 'site',
        onUp: () => logging.info('Adding linkedin social media setting'),
        onDown: () => logging.info('Removing linkedin social media setting')
    })
); 