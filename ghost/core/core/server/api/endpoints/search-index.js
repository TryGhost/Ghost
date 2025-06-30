const getPostServiceInstance = require('../../services/posts/posts-service');
const postsService = getPostServiceInstance();

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'search_index',
    fetchPosts: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        query() {
            const options = {
                limit: '10000',
                order: 'updated_at DESC',
                columns: ['id', 'url', 'title', 'status', 'published_at', 'visibility']
            };

            return postsService.browsePosts(options);
        }
    }
};

module.exports = controller;
