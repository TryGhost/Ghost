/**
 * # Utils
 * Parts of the model code which can be split out and unit tested
 */
var _               = require('lodash'),
    collectionQuery,
    filtering,
    addPostCount;

addPostCount = function addPostCount(options, itemCollection) {
    if (options.include && options.include.indexOf('post_count') > -1) {
        itemCollection.query('columns', 'tags.*', function (qb) {
            qb.count('posts_tags.post_id').from('posts_tags').whereRaw('tag_id = tags.id').as('post_count');
        });

        options.withRelated = _.pull([].concat(options.withRelated), 'post_count');
        options.include = _.pull([].concat(options.include), 'post_count');
    }
};

collectionQuery = {
    count: function count(collection, options) {
        addPostCount(options, collection);
    }
};

filtering = {
    preFetch: function preFetch(filterObjects) {
        var promises = [];
        _.forOwn(filterObjects, function (obj) {
            promises.push(obj.fetch());
        });

        return promises;
    },
    query: function query(filterObjects, itemCollection) {
        if (filterObjects.tags) {
            itemCollection
                .query('join', 'posts_tags', 'posts_tags.post_id', '=', 'posts.id')
                .query('where', 'posts_tags.tag_id', '=', filterObjects.tags.id);
        }

        if (filterObjects.author) {
            itemCollection
                .query('where', 'author_id', '=', filterObjects.author.id);
        }

        if (filterObjects.roles) {
            itemCollection
                .query('join', 'roles_users', 'roles_users.user_id', '=', 'users.id')
                .query('where', 'roles_users.role_id', '=', filterObjects.roles.id);
        }
    },
    formatResponse: function formatResponse(filterObjects, options, data) {
        if (!_.isEmpty(filterObjects)) {
            data.meta.filters = {};
        }

        _.forOwn(filterObjects, function (obj, key) {
            if (!filterObjects[key].isNew()) {
                data.meta.filters[key] = [filterObjects[key].toJSON(options)];
            }
        });

        return data;
    }
};

module.exports.filtering = filtering;
module.exports.collectionQuery = collectionQuery;
module.exports.addPostCount = addPostCount;
