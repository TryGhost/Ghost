var _      = require('lodash'),
    api    = require('../../../api'),
    urlService = require('../../../services/url'),
    BaseMapGenerator = require('./base-generator');

// A class responsible for generating a sitemap from posts and keeping it updated
function PageMapGenerator(opts) {
    _.extend(this, opts);

    BaseMapGenerator.apply(this, arguments);
}

// Inherit from the base generator class
_.extend(PageMapGenerator.prototype, BaseMapGenerator.prototype);

_.extend(PageMapGenerator.prototype, {
    bindEvents: function () {
        var self = this;
        this.dataEvents.on('page.published', self.addOrUpdateUrl.bind(self));
        this.dataEvents.on('page.published.edited', self.addOrUpdateUrl.bind(self));
        // Note: This is called if a published post is deleted
        this.dataEvents.on('page.unpublished', self.removeUrl.bind(self));
    },

    getData: function () {
        return api.posts.browse({
            context: {
                internal: true
            },
            filter: 'visibility:public',
            status: 'published',
            staticPages: true,
            limit: 'all'
        }).then(function (resp) {
            var homePage = {
                id: 0,
                name: 'home'
            };
            return [homePage].concat(resp.posts);
        });
    },

    validateDatum: function (datum) {
        return datum.name === 'home' || (datum.page === true && datum.visibility === 'public');
    },

    getUrlForDatum: function (post) {
        if (post.id === 0 && !_.isEmpty(post.name)) {
            return urlService.utils.urlFor(post.name, true);
        }

        return urlService.utils.urlFor('post', {post: post}, true);
    },

    getPriorityForDatum: function (post) {
        // TODO: We could influence this with priority or meta information
        return post && post.name === 'home' ? 1.0 : 0.8;
    }
});

module.exports = PageMapGenerator;
