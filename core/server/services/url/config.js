var api = require('../../api'),
    urlUtils  = require('../../utils').url;

module.exports = {
    post: {
        prefetch: function prefetch() {
            return api.posts.browse({
                context: {
                    internal: true
                },
                filter: 'visibility:public+status:published+page:false',
                limit: 'all',
                include: 'author,tags'
            })
                .then(function formatResponse(resp) {
                    return resp.posts;
                });
        },
        toUrl: function toUrl(post) {
            return urlUtils.urlFor('post', {post: post}, true);
        }
    },
    page: {
        prefetch: function prefetch() {
            return api.posts.browse({
                context: {
                    internal: true
                },
                filter: 'visibility:public+status:published+page:true',
                limit: 'all',
                include: 'author,tags'
            })
                .then(function formatResponse(resp) {
                    return resp.posts;
                });
        },
        toUrl: function toUrl(post) {
            return urlUtils.urlFor('post', {post: post}, true);
        }
    },
    tag: {
        prefetch: function prefetch() {
            return api.tags.browse({
                context: {
                    internal: true
                },
                filter: 'visibility:public',
                limit: 'all'
            }).then(function formatResponse(resp) {
                return resp.tags;
            });
        },
        toUrl: function toUrl(tag) {
            return urlUtils.urlFor('tag', {tag: tag}, true);
        }
    },
    author: {
        prefetch: function prefetch() {
            return api.users.browse({
                context: {
                    internal: true
                },
                filter: 'visibility:public',
                limit: 'all'
            }).then(function (resp) {
                return resp.users;
            });
        },
        toUrl: function toUrl(author) {
            return urlUtils.urlFor('author', {author: author}, true);
        }
    }
};
