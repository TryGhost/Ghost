const url = require('url');
const _ = require('lodash');
const testUtils = require('../../../../utils');
const schema = require('../../../../../server/data/schema').tables;
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
    post: _(schema.posts)
        .keys()
        // by default we only return html
        .without('mobiledoc', 'plaintext')
        // swaps author_id to author, and always returns computed properties: url, comment_id, primary_tag, primary_author
        .without('author_id').concat('author', 'url', 'primary_tag', 'primary_author')
        .value(),
    user: _(schema.users).keys().without('password').without('ghost_auth_access_token').value(),
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
    webhook: _(schema.webhooks)
            .keys()
            .without(
                'name',
                'last_triggered_at',
                'last_triggered_error',
                'last_triggered_status',
                'secret',
                'integration_id'
            )
            .value()
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
    }
};
