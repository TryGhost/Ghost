const searchIndexService = require('../../services/search-index');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'search_index',
    fetchPosts: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query() {
            return searchIndexService.fetchPosts();
        }
    }
};

module.exports = controller;
