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
        permissions: true,
        query() {
            const options = {
                filter: 'type:post',
                limit: '10000',
                order: 'updated_at DESC',
                columns: ['id', 'slug', 'title', 'excerpt', 'url', 'updated_at', 'visibility']
            };

            return postsService.browsePosts(options);
        }
    },
    fetchAuthors: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query() {
            const options = {
                limit: '10000',
                order: 'updated_at DESC',
                columns: ['id', 'slug', 'name', 'url', 'profile_image']
            };

            return models.Author.findPage(options);
        }
    },
    fetchTags: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query() {
            const options = {
                limit: '10000',
                order: 'updated_at DESC',
                columns: ['id', 'slug', 'name', 'url'],
                filter: 'visibility:public'
            };

            return models.Tag.findPage(options);
        }
    }
};

module.exports = controller;
