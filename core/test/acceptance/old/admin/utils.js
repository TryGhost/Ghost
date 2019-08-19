const url = require('url');
const _ = require('lodash');
const testUtils = require('../../../utils');
const schema = require('../../../../server/data/schema').tables;
const API_URL = '/ghost/api/v2/admin/';

const expectedProperties = {
    // API top level
    posts: ['posts', 'meta'],
    pages: ['pages', 'meta'],
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
    actions: ['actions', 'meta'],

    action: ['id', 'resource_type', 'actor_type', 'event', 'created_at', 'actor'],

    config: ['version', 'environment', 'database', 'mail', 'labs', 'clientExtensions', 'enableDeveloperExperiments', 'useGravatar'],

    post: _(schema.posts)
        .keys()
        // by default we only return mobildoc
        .without('html', 'plaintext')
        .without('visibility')
        .without('locale')
        .without('page')
        // deprecated
        .without('author_id')
        // always returns computed properties
        .concat('url', 'primary_tag', 'primary_author', 'excerpt')
        // returned by default
        .concat('tags', 'authors')
    ,

    page: _(schema.posts)
        .keys()
        // by default we only return mobildoc
        .without('html', 'plaintext')
        .without('visibility')
        .without('locale')
        .without('page')
        // deprecated
        .without('author_id')
        // always returns computed properties
        .concat('url', 'primary_tag', 'primary_author', 'excerpt')
        // returned by default
        .concat('tags', 'authors')
    ,

    user: _(schema.users)
        .keys()
        .without('visibility')
        .without('password')
        .without('locale')
        .without('ghost_auth_access_token')
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
    accesstoken: _(schema.accesstokens)
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

    getValidAdminToken(audience) {
        const jwt = require('jsonwebtoken');
        const JWT_OPTIONS = {
            keyid: testUtils.DataGenerator.Content.api_keys[0].id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: audience
        };

        return jwt.sign(
            {},
            Buffer.from(testUtils.DataGenerator.Content.api_keys[0].secret, 'hex'),
            JWT_OPTIONS
        );
    }
};
