const url = require('url');
const _ = require('lodash');
const testUtils = require('../../../../utils');
const schema = require('../../../../../server/data/schema').tables;
const API_URL = '/ghost/api/v2/content/';

const expectedProperties = {
    // API top level
    posts: ['posts', 'meta'],
    tags: ['tags', 'meta'],
    authors: ['authors', 'meta'],
    pagination: ['page', 'limit', 'pages', 'total', 'next', 'prev'],
    post: _(schema.posts)
        .keys()
        // by default we only return html
        .without('mobiledoc', 'plaintext')
        // swaps author_id to author, and always returns computed properties: url, comment_id, primary_tag, primary_author
        .without('author_id').concat('author', 'url', 'primary_tag', 'primary_author')
        .value(),
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
    tag: _(schema.tags).keys().without('parent_id').concat('parent').value()
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
        return _.repeat('c', 128);
    }
};
