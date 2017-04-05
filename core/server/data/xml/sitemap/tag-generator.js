var _      = require('lodash'),
    api    = require('../../../api'),
    utils  = require('../../../utils'),
    BaseMapGenerator = require('./base-generator');

// A class responsible for generating a sitemap from posts and keeping it updated
function TagsMapGenerator(opts) {
    _.extend(this, opts);

    BaseMapGenerator.apply(this, arguments);
}

// Inherit from the base generator class
_.extend(TagsMapGenerator.prototype, BaseMapGenerator.prototype);

_.extend(TagsMapGenerator.prototype, {
    bindEvents: function () {
        var self = this;
        this.dataEvents.on('tag.added', self.addOrUpdateUrl.bind(self));
        this.dataEvents.on('tag.edited', self.addOrUpdateUrl.bind(self));
        this.dataEvents.on('tag.deleted', self.removeUrl.bind(self));
    },

    getData: function () {
        return api.tags.browse({
            context: {
                public: true
            },
            filter: 'visibility:public',
            limit: 'all',
            include: 'count.posts'
        }).then(function (resp) {
            return _.filter(resp.tags, function (tag) {
                return tag.count.posts > 0;
            });
        });
    },

    validateDatum: function (datum) {
        return datum.visibility === 'public';
    },

    getUrlForDatum: function (tag) {
        return utils.url.urlFor('tag', {tag: tag}, true);
    },

    getPriorityForDatum: function () {
        // TODO: We could influence this with meta information
        return 0.6;
    }
});

module.exports = TagsMapGenerator;
