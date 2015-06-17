/**
 * # Utils
 * Parts of the model code which can be split out and unit tested
 */
var _               = require('lodash'),
    filtering;

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
