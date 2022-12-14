const url = require('url');
const _ = require('lodash');
const testUtils = require('../../utils');

const API_URL = '/ghost/api/content/';

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
        'feature_image_alt',
        'feature_image_caption',
        'featured',
        'visibility',
        'email_segment',
        'created_at',
        'updated_at',
        'published_at',
        'custom_excerpt',
        'codeinjection_head',
        'codeinjection_foot',
        'custom_template',
        'canonical_url',
        'url',
        'excerpt',
        'access',
        'og_image',
        'og_title',
        'og_description',
        'twitter_image',
        'twitter_title',
        'twitter_description',
        'meta_title',
        'meta_description',
        'email_subject',
        'frontmatter',
        'reading_time'
    ],
    author: [
        'id',
        'name',
        'slug',
        'profile_image',
        'cover_image',
        'bio',
        'website',
        'location',
        'facebook',
        'twitter',
        'meta_title',
        'meta_description'
    ],
    tag: [
        'id',
        'name',
        'slug',
        'description',
        'feature_image',
        'visibility',
        'og_image',
        'og_title',
        'og_description',
        'twitter_image',
        'twitter_title',
        'twitter_description',
        'meta_title',
        'meta_description',
        'codeinjection_head',
        'codeinjection_foot',
        'canonical_url',
        'accent_color'
    ]
};

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
