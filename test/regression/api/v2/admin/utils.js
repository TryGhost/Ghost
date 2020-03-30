const url = require('url');
const _ = require('lodash');
const testUtils = require('../../../../utils');
const schema = require('../../../../../core/server/data/schema').tables;
const API_URL = '/ghost/api/v2/admin/';

const expectedProperties = {
    // API top level
    posts: ['posts', 'meta'],
    tags: ['tags', 'meta'],
    users: ['users', 'meta'],
    settings: ['settings', 'meta'],
    subscribers: ['subscribers', 'meta'],
    roles: ['roles'],
    pagination: ['page', 'limit', 'pages', 'total', 'next', 'prev'],
    slugs: ['slugs'],
    slug: ['slug'],
    invites: ['invites', 'meta'],
    themes: ['themes'],

    post: _(schema.posts)
        .keys()
        // by default we only return mobiledoc
        .without('html', 'plaintext')
        .without('visibility')
        .without('locale')
        .without('page')
        .without('author_id', 'author')
        // emails are not supported in API v2
        .without('send_email_when_published')
        // always returns computed properties
        .concat('url', 'primary_tag', 'primary_author', 'excerpt')
        .concat('authors', 'tags')
        // returns meta fields from `posts_meta` schema
        .concat(
            ..._(schema.posts_meta).keys()
                .without('post_id', 'id')
                // emails are not supported in API v2
                .without('email_subject')
        )
    ,
    user: _(schema.users)
        .keys()
        .without('visibility')
        .without('password')
        .without('locale')
        .without('ghost_auth_id')
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
    subscriber: _(schema.subscribers)
        .keys()
    ,
    member: _(schema.members)
        .keys()
    ,
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
