var _ = require('lodash'),
    api = require('../../api'),
    BaseMapGenerator = require('./base-generator'),
    config = require('../../config');

// A class responsible for generating a sitemap from posts and keeping it updated
function TagsMapGenerator(opts) {
    _.extend(this, _.defaults(opts || {}, TagsMapGenerator.Defaults));

    BaseMapGenerator.apply(this, arguments);
}

TagsMapGenerator.Defaults = {
    // TODO?
};

// Inherit from the base generator class
_.extend(TagsMapGenerator.prototype, BaseMapGenerator.prototype);

_.extend(TagsMapGenerator.prototype, {
    getData: function () {
        return api.tags.browse({
            context: {
                internal: true
            },
            limit: 'all'
        }).then(function (resp) {
            return resp.tags;
        });
    },

    getUrlForDatum: function (tag, permalinks) {
        return config.urlFor('tag', {tag: tag, permalinks: permalinks}, true);
    },

    getPriorityForDatum: function () {
        // TODO: We could influence this with meta information
        return 0.6;
    }
});

module.exports = TagsMapGenerator;
