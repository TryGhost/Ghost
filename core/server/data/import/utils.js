var when   = require('when'),
    _      = require('lodash'),
    models = require('../../models'),

    internal = {context: {internal: true}},
    utils,
    areEmpty,
    updatedSettingKeys,
    stripProperties;

updatedSettingKeys = {
    activePlugins: 'activeApps',
    installedPlugins: 'installedApps'
};

areEmpty = function (object) {
    var fields = _.toArray(arguments).slice(1),
        areEmpty = _.all(fields, function (field) {
            return _.isEmpty(object[field]);
        });

    return areEmpty;
};

stripProperties = function stripProperties(properties, data) {
    data = _.clone(data, true);
    _.each(data, function (obj) {
        _.each(properties, function (property) {
            delete obj[property];
        });
    });
    return data;
};

utils = {
    preProcessPostTags: function preProcessPostTags(tableData) {
        var postTags,
            postsWithTags = {};


        postTags = tableData.posts_tags;
        _.each(postTags, function (post_tag) {
            if (!postsWithTags.hasOwnProperty(post_tag.post_id)) {
                postsWithTags[post_tag.post_id] = [];
            }
            postsWithTags[post_tag.post_id].push(post_tag.tag_id);
        });

        _.each(postsWithTags, function (tag_ids, post_id) {
            var post, tags;
            post = _.find(tableData.posts, function (post) {
                return post.id === parseInt(post_id, 10);
            });
            if (post) {
                tags = _.filter(tableData.tags, function (tag) {
                    return _.indexOf(tag_ids, tag.id) !== -1;
                });
                post.tags = [];
                _.each(tags, function (tag) {
                    // names are unique.. this should get the right tags added
                    // as long as tags are added first;
                    post.tags.push({name: tag.name});
                });
            }
        });

        return tableData;
    },

    preProcessRolesUsers: function preProcessRolesUsers(tableData) {
        _.each(tableData.roles_users, function (role_user) {
            var user = _.find(tableData.users, function (user) {
                return user.id === parseInt(role_user.user_id, 10);
            });
            // just the one role for now
            if (user && !user.roles) {
                user.roles = [role_user.role_id];
            }
        });

        return tableData;
    },

    importTags: function importTags(ops, tableData, transaction) {
        tableData = stripProperties(['id'], tableData);
        _.each(tableData, function (tag) {
             // Validate minimum tag fields
            if (areEmpty(tag, 'name', 'slug')) {
                return;
            }

            ops.push(models.Tag.findOne({name: tag.name}, {transacting: transaction}).then(function (_tag) {
                if (!_tag) {
                    return models.Tag.add(tag, _.extend(internal, {transacting: transaction}))
                        // add pass-through error handling so that bluebird doesn't think we've dropped it
                        .catch(function (error) {
                            return when.reject({raw: error, model: 'tag', data: tag});
                        });
                }
                return when.resolve(_tag);
            }));
        });
    },

    importPosts: function importPosts(ops, tableData, transaction) {
        tableData = stripProperties(['id'], tableData);
        _.each(tableData, function (post) {
             // Validate minimum post fields
            if (areEmpty(post, 'title', 'slug', 'markdown')) {
                return;
            }
            ops.push(models.Post.add(post, _.extend(internal, {transacting: transaction, importing: true}))
                // add pass-through error handling so that bluebird doesn't think we've dropped it
                .catch(function (error) {
                    return when.reject({raw: error, model: 'post', data: post});
                }));
        });
    },

    importUsers: function importUsers(ops, tableData, transaction) {
        tableData = stripProperties(['id'], tableData);
        _.each(tableData, function (user) {
             // Validate minimum user fields
            if (areEmpty(user, 'name', 'slug', 'email')) {
                return;
            }

            ops.push(models.User.add(user, _.extend(internal, {transacting: transaction}))
                // add pass-through error handling so that bluebird doesn't think we've dropped it
                .catch(function (error) {
                    return when.reject({raw: error, model: 'user', data: user});
                }));
        });
    },

    importSingleUser: function importSingleUser(ops, tableData, transaction) {
        // don't override the users credentials
        tableData = stripProperties(['id', 'email', 'password'], tableData);
        tableData[0].id = 1;
        ops.push(models.User.edit(tableData[0], _.extend(internal, {id: 1, transacting: transaction}))
            // add pass-through error handling so that bluebird doesn't think we've dropped it
            .otherwise(function (error) {
                return when.reject(error);
            }));
    },

    importSettings: function importSettings(ops, tableData, transaction) {
        // for settings we need to update individual settings, and insert any missing ones
        // settings we MUST NOT update are 'core' and 'theme' settings
        // as all of these will cause side effects which don't make sense for an import
        var blackList = ['core', 'theme'];

        tableData = stripProperties(['id'], tableData);
        tableData = _.filter(tableData, function (data) {
            return blackList.indexOf(data.type) === -1;
        });

        // Clean up legacy plugin setting references
        _.each(tableData, function (datum) {
            datum.key = updatedSettingKeys[datum.key] || datum.key;
        });

        ops.push(models.Settings.edit(tableData, _.extend(internal, {transacting: transaction}))
             // add pass-through error handling so that bluebird doesn't think we've dropped it
             .catch(function (error) {
                return when.reject({raw: error, model: 'setting', data: tableData});
            }));
    },

    /** For later **/
    importApps: function importApps(ops, tableData, transaction) {
        tableData = stripProperties(['id'], tableData);
        _.each(tableData, function (app) {
            // Avoid duplicates
            ops.push(models.App.findOne({name: app.name}, {transacting: transaction}).then(function (_app) {
                if (!_app) {
                    return models.App.add(app, _.extend(internal, {transacting: transaction}))
                        // add pass-through error handling so that bluebird doesn't think we've dropped it
                        .catch(function (error) {
                            return when.reject({raw: error, model: 'app', data: app});
                        });
                }
                return when.resolve(_app);
            }));
        });
    }
};

module.exports = utils;