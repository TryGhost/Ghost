const logging = require('../../../../../shared/logging');

// type mapping for settings. object types are ignored for now
const typeMapping = [
    {
        keys: [
            'db_hash',
            'session_secret',
            'theme_session_secret',
            'ghost_public_key',
            'ghost_private_key',
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
            'meta_title',
            'meta_description',
            'og_image',
            'og_title',
            'og_description',
            'twitter_image',
            'twitter_title',
            'twitter_description',
            'active_theme',
            'password',
            'public_hash',
            'members_public_key',
            'members_private_key',
            'members_email_auth_secret',
            'default_content_visibility',
            'members_from_address',
            'stripe_product_name',
            'stripe_secret_key',
            'stripe_publishable_key',
            'stripe_connect_publishable_key',
            'stripe_connect_secret_key',
            'stripe_connect_display_name',
            'stripe_connect_account_id'
        ],
        type: 'string'
    },
    {
        keys: [
            'notifications',
            'navigation',
            'secondary_navigation',
            'slack',
            'shared_views',
            'portal_plans',
            'stripe_plans'
        ],
        type: 'array'
    },
    {
        keys: [
            'next_update_check'
        ],
        type: 'number'
    },
    {
        keys: [
            'amp',
            'is_private',
            'members_allow_free_signup',
            'portal_name',
            'portal_button',
            'stripe_connect_livemode'
        ],
        type: 'boolean'
    },
    {
        keys: [
            'labs',
            'unsplash',
            'bulk_email_settings'
        ],
        type: 'object'
    }
];

module.exports = {
    config: {
        transaction: true
    },

    async up(options) {
        // set the new type for each setting
        await Promise.map(typeMapping, async (typeMap) => {
            return await Promise.map(typeMap.keys, async (key) => {
                const typeValue = typeMap.type;
                logging.info(`Updating type for setting ${key} to ${typeValue}`);

                return await options
                    .transacting('settings')
                    .where('key', key)
                    .update({
                        type: typeValue
                    });
            });
        });
    },

    async down(options) {
        // put type values back to same as group values
        return await Promise.map(typeMapping, async (typeMap) => {
            return await Promise.map(typeMap.keys, async (key) => {
                logging.info(`Resetting type for ${key}`);
                const groupResult = await options
                    .transacting('settings')
                    .where('key', key)
                    .select('group');
                const groupValue = groupResult[0].group;
                return await options
                    .transacting('settings')
                    .where('key', key)
                    .update({
                        type: groupValue
                    });
            });
        });
    }
};
