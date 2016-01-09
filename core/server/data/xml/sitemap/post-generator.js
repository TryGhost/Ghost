var _      = require('lodash'),
    api    = require('../../../api'),
    config = require('../../../config'),
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
        this.dataEvents.on('post.unpublished', self.removeUrl.bind(self));
    },

    getData: function () {
        return api.posts.browse({
            context: {
                internal: true
            },
            status: 'published',
            staticPages: false,
            limit: 'all'
        }).then(function (resp) {
            return resp.posts;
        });
    },

    getUrlForDatum: function (post) {
        return config.urlFor('post', {post: post}, true);
    },

    getPriorityForDatum: function (post) {
        // give a slightly higher priority to featured posts
        return post.featured ? 0.9 : 0.8;
    }
});

module.exports = PostMapGenerator;
