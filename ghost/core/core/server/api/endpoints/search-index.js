const models = require('../../models');
const getPostServiceInstance = require('../../services/posts/posts-service-instance');
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
                filter: 'type:post+status:[draft,published,scheduled,sent]',
                limit: '10000',
                order: 'updated_at DESC',
                columns: ['id', 'uuid', 'url', 'title', 'slug', 'status', 'published_at', 'visibility']
            };

            return postsService.browsePosts(options);
        }
    },
    fetchPages: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        query() {
            const options = {
                filter: 'type:page+status:[draft,published,scheduled]',
                limit: '10000',
                order: 'updated_at DESC',
                columns: ['id', 'uuid', 'url', 'title', 'slug', 'status', 'published_at', 'visibility']
            };

            return postsService.browsePosts(options);
        }
    },
    fetchTags: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'tags',
            method: 'browse'
        },
        query() {
            const options = {
                limit: '10000',
                order: 'updated_at DESC',
                columns: ['id', 'slug', 'name', 'url']
            };

            return models.Tag.findPage(options);
        }
    },
    fetchUsers: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'users',
            method: 'browse'
        },
        query() {
            const options = {
                limit: '10000',
                order: 'updated_at DESC',
                columns: ['id', 'slug', 'url', 'name', 'profile_image']
            };

            return models.User.findPage(options);
        }
    }
};

module.exports = controller;
