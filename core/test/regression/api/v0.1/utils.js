const url = require('url');
const _ = require('lodash');
const testUtils = require('../../../utils/index');
const schema = require('../../../../server/data/schema/index').tables;
const API_URL = '/ghost/api/v0.1/';

const expectedProperties = {
    // API top level
    posts: ['posts', 'meta'],
    tags: ['tags', 'meta'],
    users: ['users', 'meta'],
    authors: ['authors', 'meta'],
    settings: ['settings', 'meta'],
    subscribers: ['subscribers', 'meta'],
    roles: ['roles'],
    pagination: ['page', 'limit', 'pages', 'total', 'next', 'prev'],
    slugs: ['slugs'],
    slug: ['slug'],
    post: _(schema.posts)
        .keys()
        // by default we only return html
        .without('mobiledoc', 'plaintext')
        // swaps author_id to author, and always returns computed properties: url, comment_id, primary_tag, primary_author
        .without('author_id').concat('author', 'url', 'primary_tag', 'primary_author')
        .without('canonical_url')
        .value(),
    user: {
        default: _(schema.users).keys().without('password').without('ghost_auth_access_token').value(),
        public: _(schema.users)
            .keys()
            .without(
                'password',
                'email',
                'ghost_auth_access_token',
                'ghost_auth_id',
                'created_at',
                'created_by',
                'updated_at',
                'updated_by',
                'last_seen',
                'status'
            )
            .value()
    },
    author: _(schema.users)
        .keys()
        .without(
            'password',
            'email',
            'ghost_auth_access_token',
            'ghost_auth_id',
            'created_at',
            'created_by',
            'updated_at',
            'updated_by',
            'last_seen',
            'status'
        )
        .value()
    ,
    // Tag API swaps parent_id to parent
    tag: _(schema.tags).keys().without('parent_id').concat('parent').value(),
    setting: _.keys(schema.settings),
    subscriber: _.keys(schema.subscribers),
    accesstoken: _.keys(schema.accesstokens),
    role: _.keys(schema.roles),
    permission: _.keys(schema.permissions),
    notification: ['type', 'message', 'status', 'id', 'dismissible', 'location', 'custom'],
    theme: ['name', 'package', 'active'],
    themes: ['themes'],
    invites: ['invites', 'meta'],
    invite: _(schema.invites).keys().without('token').value(),
    webhook: {
        default: _(schema.webhooks)
            .keys()
            .value()
    }
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

    doAuth() {
        const args = Array.prototype.slice.call(arguments);
        args.unshift(`${API_URL}authentication/token/`);
        return testUtils.API.doAuth.apply(null, args);
    }
};
