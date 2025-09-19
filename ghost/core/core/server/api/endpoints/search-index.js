const models = require('../../models');
const getPostServiceInstance = require('../../services/posts/posts-service');
const postsService = getPostServiceInstance();
const {flattenSettingsIndex} = require('../../../shared/settings-search-index');

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
                columns: ['id', 'url', 'title', 'status', 'published_at', 'visibility']
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
                columns: ['id', 'url', 'title', 'status', 'published_at', 'visibility']
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
    },
    fetchSettings: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'settings',
            method: 'browse'
        },
        query() {
            // Return the flattened settings index
            // This doesn't need database access as it's static configuration
            const settings = flattenSettingsIndex();

            // Transform to match the expected format for search results
            const transformedSettings = settings.map(setting => ({
                id: setting.id,
                url: `/settings/${setting.path}`,
                title: setting.title,
                path: setting.path,
                section: setting.section,
                keywords: setting.keywords
            }));

            return {
                data: transformedSettings,
                meta: {
                    pagination: {
                        page: 1,
                        limit: transformedSettings.length,
                        pages: 1,
                        total: transformedSettings.length
                    }
                }
            };
        }
    }
};

module.exports = controller;
