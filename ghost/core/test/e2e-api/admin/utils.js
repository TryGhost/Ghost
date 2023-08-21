const url = require('url');
const _ = require('lodash');
const testUtils = require('../../utils');

// NOTE: the dependance on the schema here is wrong! It is a design flaw which is causing problems for API maintenance and compatibility
//       whenever you need to modify any of the below property lists using schema - rework them into an "allowlist" array like it's done in
//       the commit introducing this comment.
const schema = require('../../../core/server/data/schema').tables;

const API_URL = '/ghost/api/admin/';

const expectedProperties = {
    // API top level
    posts: ['posts', 'meta'],
    pages: ['pages', 'meta'],
    tags: ['tags', 'meta'],
    users: ['users', 'meta'],
    settings: ['settings', 'meta'],
    roles: ['roles'],
    pagination: ['page', 'limit', 'pages', 'total', 'next', 'prev'],
    slugs: ['slugs'],
    slug: ['slug'],
    invites: ['invites', 'meta'],
    themes: ['themes'],
    actions: ['actions', 'meta'],
    members: ['members', 'meta'],
    snippets: ['snippets', 'meta'],

    action: ['id', 'resource_type', 'actor_type', 'event', 'created_at', 'actor', 'context', 'resource_id', 'actor_id'],

    config: [
        'version',
        'environment',
        'database',
        'mail',
        'labs',
        'clientExtensions',
        'enableDeveloperExperiments',
        'useGravatar',
        'stripeDirect',
        'emailAnalytics',
        'tenor',
        'mailgunIsConfigured',
        'editor',
        'adminX',
        'signupForm'
    ],

    post: [
        'id',
        'uuid',
        'title',
        'slug',
        'mobiledoc',
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
        'post_revisions',
        'reading_time'
    ],

    page: [
        'id',
        'uuid',
        'title',
        'slug',
        'mobiledoc',
        'comment_id',
        'feature_image',
        'feature_image_alt',
        'feature_image_caption',
        'featured',
        'status',
        'visibility',
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
        'og_image',
        'og_title',
        'og_description',
        'twitter_image',
        'twitter_title',
        'twitter_description',
        'meta_title',
        'meta_description',
        'frontmatter',
        'tiers',
        'count',
        'post_revisions',
        'show_title_and_feature_image'
    ],

    user: _(schema.users)
        .keys()
        .without('visibility')
        .without('password')
        .without('locale')
        .concat('url')
    ,
    tag: _(schema.tags)
        .keys()
        // unused field
        .without('parent_id')
    ,
    setting: _(schema.settings)
        .keys()
    ,
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
        'comped',
        'last_seen_at',
        'labels'
    ],
    member_signin_url: ['member_id', 'url'],
    role: _(schema.roles)
        .keys()
    ,
    permission: _(schema.permissions)
        .keys()
    ,
    notification: ['type', 'message', 'status', 'id', 'dismissible', 'location', 'custom'],
    theme: ['name', 'package', 'active'],
    invite: _(schema.invites)
        .keys()
        .without('token')
    ,
    webhook: _(schema.webhooks)
        .keys()
    ,
    email: _(schema.emails)
        .keys(),
    email_previews: ['html', 'subject', 'plaintext'],
    email_recipient: _(schema.email_recipients)
        .keys()
        .filter(key => key.indexOf('@@') === -1),
    snippet: _(schema.snippets).keys()
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

    doAuth(...args) {
        return testUtils.API.doAuth(`${API_URL}session/`, ...args);
    },

    getValidAdminToken(audience, keyid = 0) {
        const jwt = require('jsonwebtoken');
        const JWT_OPTIONS = {
            keyid: testUtils.DataGenerator.Content.api_keys[keyid].id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: audience
        };

        return jwt.sign(
            {},
            Buffer.from(testUtils.DataGenerator.Content.api_keys[keyid].secret, 'hex'),
            JWT_OPTIONS
        );
    },

    async startGhost(overrides = {}) {
        const defaults = {
            backend: true,
            frontend: false
        };

        return await testUtils.startGhost(Object.assign(defaults, overrides));
    }
};
