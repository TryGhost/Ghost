var when   = require('when'),
    _      = require('lodash'),
    models = require('../../models'),
    Importer000;


Importer000 = function () {
    _.bindAll(this, 'basicImport');

    this.version = '000';

    this.importFrom = {
        '000': this.basicImport,
        '001': this.basicImport,
        '002': this.basicImport
    };
};

Importer000.prototype.importData = function (data) {
    return this.canImport(data)
        .then(function (importerFunc) {
            return importerFunc(data);
        }, function (reason) {
            return when.reject(reason);
        });
};

Importer000.prototype.canImport = function (data) {
    if (data.meta && data.meta.version && this.importFrom[data.meta.version]) {
        return when.resolve(this.importFrom[data.meta.version]);
    }

    return when.reject("Unsupported version of data: " + data.meta.version);
};


function stripProperties(properties, data) {
    _.each(data, function (obj) {
        _.each(properties, function (property) {
            delete obj[property];
        });
    });
    return data;
}

function preProcessPostTags(tableData) {
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
}

function importTags(ops, tableData, transaction) {
    tableData = stripProperties(['id'], tableData);
    _.each(tableData, function (tag) {
        ops.push(models.Tag.findOne({name: tag.name}, {transacting: transaction}).then(function (_tag) {
            if (!_tag) {
                return models.Tag.add(tag, {transacting: transaction})
                    // add pass-through error handling so that bluebird doesn't think we've dropped it
                    .otherwise(function (error) { return when.reject(error); });
            }
            return when.resolve(_tag);
        }));
    });
}

function importPosts(ops, tableData, transaction) {
    tableData = stripProperties(['id'], tableData);
    _.each(tableData, function (post) {
        ops.push(models.Post.add(post, {transacting: transaction, importing: true})
            // add pass-through error handling so that bluebird doesn't think we've dropped it
            .otherwise(function (error) { return when.reject(error); }));
    });
}

function importUsers(ops, tableData, transaction) {
    // don't override the users credentials
    tableData = stripProperties(['id', 'email', 'password'], tableData);
    tableData[0].id = 1;
    ops.push(models.User.edit(tableData[0], {transacting: transaction})
        // add pass-through error handling so that bluebird doesn't think we've dropped it
        .otherwise(function (error) { return when.reject(error); }));
}

function importSettings(ops, tableData, transaction) {
    // for settings we need to update individual settings, and insert any missing ones
    // settings we MUST NOT update are 'core' and 'theme' settings
    // as all of these will cause side effects which don't make sense for an import
    var blackList = ['core', 'theme'];

    tableData = stripProperties(['id'], tableData);
    tableData = _.filter(tableData, function (data) {
        return blackList.indexOf(data.type) === -1;
    });

    ops.push(models.Settings.edit(tableData, transaction)
         // add pass-through error handling so that bluebird doesn't think we've dropped it
         .otherwise(function (error) { return when.reject(error); }));
}

// No data needs modifying, we just import whatever tables are available
Importer000.prototype.basicImport = function (data) {
    var ops = [],
        tableData = data.data;
    return models.Base.transaction(function (t) {

        // Do any pre-processing of relationships (we can't depend on ids)
        if (tableData.posts_tags && tableData.posts && tableData.tags) {
            tableData = preProcessPostTags(tableData);
        }

        // Import things in the right order:
        if (tableData.tags && tableData.tags.length) {
            importTags(ops, tableData.tags, t);
        }

        if (tableData.posts && tableData.posts.length) {
            importPosts(ops, tableData.posts, t);
        }

        if (tableData.users && tableData.users.length) {
            importUsers(ops, tableData.users, t);
        }

        if (tableData.settings && tableData.settings.length) {
            importSettings(ops, tableData.settings, t);
        }

        /** do nothing with these tables, the data shouldn't have changed from the fixtures
         *   permissions
         *   roles
         *   permissions_roles
         *   permissions_users
         *   roles_users
         */

        // Write changes to DB, if successful commit, otherwise rollback
        // when.all() does not work as expected, when.settle() does.
        when.settle(ops).then(function (descriptors) {
            var rej = false,
                error = '';
            descriptors.forEach(function (d) {
                if (d.state === 'rejected') {
                    error += _.isEmpty(error) ? '' : '</br>';
                    if (!_.isEmpty(d.reason.clientError)) {
                        error += d.reason.clientError;
                    } else if (!_.isEmpty(d.reason.message)) {
                        error += d.reason.message;
                    }
                    rej = true;
                }
            });
            if (rej) {
                t.rollback(error);
            } else {
                t.commit();
            }
        });
    }).then(function () {
        //TODO: could return statistics of imported items
        return when.resolve();
    }, function (error) {
        return when.reject("Error importing data: " + error);
    });
};

module.exports = {
    Importer000: Importer000,
    importData: function (data) {
        return new Importer000().importData(data);
    }
};
