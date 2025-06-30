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
            const options = {
                limit: '10000',
                order: 'updated_at DESC',
                columns: ['id', 'slug', 'title', 'excerpt', 'url', 'created_at', 'updated_at', 'published_at', 'visibility']
            };
            return searchIndexService.fetchPosts(options);
        }
    },
    fetchAuthors: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query() {
            return searchIndexService.fetchAuthors();
        }
    },
    fetchTags: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query() {
            return searchIndexService.fetchTags();
        }
    }
};

module.exports = controller;
