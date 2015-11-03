var _ = require('lodash');

module.exports = function (Bookshelf) {
    var modelProto = Bookshelf.Model.prototype,
        Model,
        countQueryBuilder;

    countQueryBuilder = {
        tags: {
            posts: function addPostCountToTags(model) {
                model.query('columns', 'tags.*', function (qb) {
                    qb.count('posts_tags.post_id')
                        .from('posts_tags')
                        .whereRaw('tag_id = tags.id')
                        .as('post_count');
                });
            }
        }
    };

    Model = Bookshelf.Model.extend({
        addCounts: function (options) {
            if (!options) {
                return;
            }

            var tableName = _.result(this, 'tableName');

            if (options.include && options.include.indexOf('post_count') > -1) {
                // remove post_count from withRelated and include
                options.withRelated = _.pull([].concat(options.withRelated), 'post_count');
                options.include = _.pull([].concat(options.include), 'post_count');

                // Call the query builder
                countQueryBuilder[tableName].posts(this);
            }
        },
        fetch: function () {
            this.addCounts.apply(this, arguments);

            // Call parent fetch
            return modelProto.fetch.apply(this, arguments);
        },
        fetchAll: function () {
            this.addCounts.apply(this, arguments);

            // Call parent fetchAll
            return modelProto.fetchAll.apply(this, arguments);
        }
    });

    Bookshelf.Model = Model;
};
