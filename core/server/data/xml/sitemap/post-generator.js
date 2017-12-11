var _ = require('lodash'),
    api = require('../../../api'),
    urlService = require('../../../services/url'),
    BaseMapGenerator = require('./base-generator');

// A class responsible for generating a sitemap from posts and keeping it updated
function PostMapGenerator(opts) {
    _.extend(this, opts);

    BaseMapGenerator.apply(this, arguments);
}

// Inherit from the base generator class
_.extend(PostMapGenerator.prototype, BaseMapGenerator.prototype);

_.extend(PostMapGenerator.prototype, {
    bindEvents: function () {
        var self = this;
        this.dataEvents.on('post.published', self.addOrUpdateUrl.bind(self));
        this.dataEvents.on('post.published.edited', self.addOrUpdateUrl.bind(self));
        // Note: This is called if a published post is deleted
        this.dataEvents.on('post.unpublished', self.removeUrl.bind(self));
    },

    getData: function () {
        return api.posts.browse({
            context: {
                internal: true
            },
            filter: 'visibility:public',
            status: 'published',
            staticPages: false,
            limit: 'all',
            include: 'author,tags'
        }).then(function (resp) {
            return resp.posts;
        });
    },

    validateDatum: function (datum) {
        return datum.page === false && datum.visibility === 'public';
    },

    getUrlForDatum: function (post) {
        return urlService.utils.urlFor('post', {post: post}, true);
    },

    getPriorityForDatum: function (post) {
        // give a slightly higher priority to featured posts
        return post.featured ? 0.9 : 0.8;
    }
});

module.exports = PostMapGenerator;
