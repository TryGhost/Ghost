const url = require('url');
const _ = require('lodash');
const testUtils = require('../../../../utils');
const schema = require('../../../../../core/server/data/schema').tables;
const API_URL = '/ghost/api/v2/content/';

const expectedProperties = {
    // API top level
    posts: ['posts', 'meta'],
    tags: ['tags', 'meta'],
    authors: ['authors', 'meta'],
    pagination: ['page', 'limit', 'pages', 'total', 'next', 'prev'],

    post: [
        'id',
        'uuid',
        'title',
        'slug',
        'html',
        'comment_id',
        'feature_image',
        'featured',
        'created_at',
        'updated_at',
        'published_at',
        'custom_excerpt',
        'codeinjection_head',
        'codeinjection_foot',
        'custom_template',
        'canonical_url',
        'url',
        'primary_tag',
        'primary_author',
        'page',
        'excerpt',
        'og_image',
        'og_title',
        'og_description',
        'twitter_image',
        'twitter_title',
        'twitter_description',
        'meta_title',
        'meta_description',
        'frontmatter'
    ],
    author: _(schema.users)
        .keys()
        .without(
            'password',
            'email',
            'ghost_auth_id',
            'created_at',
            'created_by',
            'updated_at',
            'updated_by',
            'last_seen',
            'status'
        )
        // v2 API doesn't return unused fields
        .without('accessibility', 'locale', 'tour', 'visibility')
    ,
    tag: _(schema.tags)
        .keys()
        // v2 Tag API doesn't return parent_id or parent
        .without('parent_id', 'parent')
        // v2 Tag API doesn't return date fields
        .without('created_at', 'updated_at')
        // v2 Tag API doesn't return extended meta fields
        .without(
            'og_image',
            'og_title',
            'og_description',
            'twitter_image',
            'twitter_title',
            'twitter_description',
            'codeinjection_head',
            'codeinjection_foot',
            'canonical_url',
            'accent_color'
        )
};

_.each(expectedProperties, (value, key) => {
    if (!value.__wrapped__) {
        return;
    }

    /**
     * @deprecated: x_by
     */
    expectedProperties[key] = value
        .without(
            'created_by',
            'updated_by',
            'published_by'
        )
        .value();
});

module.exports = {
    API: {
        getApiQuery(route) {
            return url.resolve(API_URL, route);
        },

        checkResponse(...args) {
            this.expectedProperties = expectedProperties;
            return testUtils.API.checkResponse.call(this, ...args);
        }
    },
    getValidKey() {
        return testUtils.DataGenerator.Content.api_keys[1].secret;
    },

    async startGhost(overrides = {}) {
        const defaults = {
            backend: true,
            frontend: false
        };

        return await testUtils.startGhost(Object.assign(defaults, overrides));
    }
};
