const Promise = require('bluebird');
const logging = require('../../../../../shared/logging');

// settings with new groups
const typeGroupMapping = [{
    keys: [
        'members_public_key',
        'members_private_key',
        'members_email_auth_secret'
    ],
    from: 'members',
    to: 'core'
}, {
    keys: [
        'title',
        'description',
        'logo',
        'cover_image',
        'icon',
        'accent_color',
        'lang',
        'timezone',
        'codeinjection_head',
        'codeinjection_foot',
        'facebook',
        'twitter',
        'navigation',
        'secondary_navigation',
        'meta_title',
        'meta_description',
        'og_image',
        'og_title',
        'og_description',
        'twitter_image',
        'twitter_title',
        'twitter_description'

    ],
    from: 'blog',
    to: 'site'
}, {
    keys: ['amp'],
    from: 'blog',
    to: 'amp'
}, {
    keys: ['labs'],
    from: 'blog',
    to: 'labs'
}, {
    keys: ['slack'],
    from: 'blog',
    to: 'slack'
}, {
    keys: ['unsplash'],
    from: 'blog',
    to: 'unsplash'
}, {
    keys: ['shared_views'],
    from: 'blog',
    to: 'views'
}, {
    keys: ['bulk_email_settings'],
    from: 'bulk_email',
    to: 'email'
}];

// settings with the same groups
const groupMapping = [{
    group: 'core',
    keys: [
        'db_hash',
        'next_update_check',
        'notifications',
        'session_secret',
        'theme_session_secret',
        'ghost_public_key',
        'ghost_private_key'
    ]
}, {
    group: 'theme',
    keys: ['active_theme']
}, {
    group: 'private',
    keys: [
        'is_private',
        'password',
        'public_hash'
    ]
}, {
    group: 'members',
    keys: [
        'default_content_visibility',
        'members_subscription_settings',
        'stripe_connect_integration'
    ]
}, {
    group: 'portal',
    keys: [
        'portal_name',
        'portal_button',
        'portal_plans'
    ]
}];

// flags to be added to settings
const flagMapping = [{
    key: 'title',
    flags: 'PUBLIC'
}, {
    key: 'description',
    flags: 'PUBLIC'
}, {
    key: 'logo',
    flags: 'PUBLIC'
}, {
    key: 'accent_color',
    flags: 'PUBLIC'
}, {
    key: 'active_theme',
    flags: 'RO'
}];

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        // set the new group for each changed setting and rename type
        await Promise.map(typeGroupMapping, async (typeGroupMap) => {
            return await Promise.map(typeGroupMap.keys, async (key) => {
                logging.info(`Moving setting ${key} from ${typeGroupMap.from} to ${typeGroupMap.to}`);

                return await options
                    .transacting('settings')
                    .where('key', key)
                    .update({
                        group: typeGroupMap.to,
                        type: typeGroupMap.to
                    });
            });
        });

        // set the correct group value settings which aren't changing type
        await Promise.map(groupMapping, async (groupMap) => {
            return await Promise.map(groupMap.keys, async (key) => {
                logging.info(`Adding setting ${key} to ${groupMap.group}`);

                return await options
                    .transacting('settings')
                    .where('key', key)
                    .update({
                        group: groupMap.group
                    });
            });
        });

        return await Promise.map(flagMapping, async (flagMap) => {
            logging.info(`Adding ${flagMap.flags} flag to ${flagMap.key} setting`);

            return await options
                .transacting('settings')
                .where('key', flagMap.key)
                .update({
                    flags: flagMap.flags
                });
        });
    },

    async down(options) {
        // clear all flags values
        logging.info('Clearing all settings flags values');
        await options
            .transacting('settings')
            .update({
                flags: null
            });

        // put type values back but leave all group values as-is because we
        // didn't change them from anything specific in `up`
        return await Promise.map(typeGroupMapping, async (typeGroupMap) => {
            return await Promise.map(typeGroupMap.keys, async (key) => {
                logging.info(`Moving setting ${key} from ${typeGroupMap.from} to ${typeGroupMap.to}`);

                return await options
                    .transacting('settings')
                    .where('key', key)
                    .update({
                        type: typeGroupMap.from
                    });
            });
        });
    }
};
