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
                columns: ['id', 'uuid', 'url', 'title', 'slug', 'status', 'published_at', 'visibility'],
                // Under lazyRouting the URL is computed at serialization
                // time from the resource's tags/authors; without them
                // every URL in a search-index hit resolves to /404/ for
                // any tag- or author-filtered route. The relations are
                // tiny (id+slug only via withRelatedFields elsewhere) and
                // stripped from the response by the standard column
                // filter, so loading them unconditionally is cheap and
                // keeps eager/lazy parity at this seam.
                withRelated: ['tags', 'authors']
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
                columns: ['id', 'uuid', 'url', 'title', 'slug', 'status', 'published_at', 'visibility'],
                withRelated: ['tags', 'authors']
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
