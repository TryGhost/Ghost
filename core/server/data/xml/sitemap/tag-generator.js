var _      = require('lodash'),
    api    = require('../../../api'),
    urlService = require('../../../services/url'),
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
                internal: true
            },
            filter: 'visibility:public',
            limit: 'all'
        }).then(function (resp) {
            return resp.tags;
        });
    },

    validateDatum: function (datum) {
        return datum.visibility === 'public';
    },

    getUrlForDatum: function (tag) {
        return urlService.utils.urlFor('tag', {tag: tag}, true);
    },

    getPriorityForDatum: function () {
        // TODO: We could influence this with meta information
        return 0.6;
    }
});

module.exports = TagsMapGenerator;
