const url = require('url');
const testUtils = require('../../../utils');

const API_URL = '/ghost/api/admin/';

const expectedProperties = {
    posts: ['posts', 'meta'],
    tags: ['tags', 'meta'],
    users: ['users', 'meta'],
    settings: ['settings', 'meta'],
    roles: ['roles'],
    pagination: ['page', 'limit', 'pages', 'total', 'next', 'prev'],
    slugs: ['slugs'],
    slug: ['slug'],
    invites: ['invites', 'meta'],
    themes: ['themes'],
    members: ['members', 'meta'],
    site: [
        'title',
        'description',
        'logo',
        'icon',
        'accent_color',
        'url',
        'version'
    ],
    post: [
        'id',
        'uuid',
        'title',
        'slug',
        'mobiledoc',
        'lexical',
        'comment_id',
        'feature_image',
        'feature_image_alt',
        'feature_image_caption',
        'featured',
        'status',
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
        'primary_tag',
        'primary_author',
        'excerpt',
        'tags',
        'authors',
        'email',
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
        'email_only',
        'tiers',
        'newsletter',
        'count',
        'reading_time'
    ],
    user: [
        'id',
        'name',
        'slug',
        'email',
        'profile_image',
        'cover_image',
        'bio',
        'website',
        'location',
        'facebook',
        'twitter',
        'accessibility',
        'status',
        'meta_title',
        'meta_description',
        'tour',
        'last_seen',
        'created_at',
        'updated_at',
        'url'
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
        'accent_color',
        'created_at',
        'updated_at'
    ],
    setting: [
        'id',
        'group',
        'key',
        'value',
        'type',
        'flags',
        'created_at',
        'updated_at'
    ],

    member: [
        'id',
        'uuid',
        'email',
        'status',
        'name',
        'note',
        'geolocation',
        'subscribed',
        'email_count',
        'email_opened_count',
        'email_open_rate',
        'created_at',
        'updated_at',
        'avatar_image',
        'labels',
        'comped'
    ],
    member_signin_url: ['member_id', 'url'],
    role: ['id', 'name', 'description', 'created_at', 'updated_at'],
    permission: [
        'id',
        'name',
        'object_type',
        'action_type',
        'object_id',
        'created_at',
        'updated_at'
    ],
    notification: [
        'type',
        'message',
        'status',
        'id',
        'dismissible',
        'location',
        'custom'
    ],
    theme: ['name', 'package', 'active'],
    invite: [
        'id',
        'role_id',
        'status',
        'email',
        'expires',
        'created_at',
        'updated_at'
    ],
    webhook: [
        'id',
        'event',
        'target_url',
        'name',
        'secret',
        'api_version',
        'integration_id',
        'last_triggered_at',
        'last_triggered_status',
        'last_triggered_error',
        'created_at',
        'updated_at'
    ],
    email_previews: ['html', 'subject', 'plaintext']
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

    doAuth(...args) {
        return testUtils.API.doAuth(`${API_URL}session/`, ...args);
    },

    async startGhost(overrides = {}) {
        const defaults = {
            backend: true,
            frontend: false
        };

        return await testUtils.startGhost(Object.assign(defaults, overrides));
    },

    getValidAdminToken(endpoint, key) {
        const jwt = require('jsonwebtoken');
        key = key || testUtils.DataGenerator.Content.api_keys[0];

        const JWT_OPTIONS = {
            keyid: key.id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: endpoint
        };

        return jwt.sign(
            {},
            Buffer.from(key.secret, 'hex'),
            JWT_OPTIONS
        );
    }
};
