var Promise = require('bluebird'),
    _       = require('lodash'),
    models  = require('../../models'),
    utils   = require('./utils'),
    i18n    = require('../../i18n'),

    internal = utils.internal,

    DataImporter;

DataImporter = function () {};

DataImporter.prototype.importData = function (data) {
    return this.doImport(data);
};

DataImporter.prototype.loadRoles = function () {
    var options = _.extend({}, internal);

    return models.Role.findAll(options).then(function (roles) {
        return roles.toJSON();
    });
};

DataImporter.prototype.loadUsers = function () {
    var users = {all: {}},
        options = _.extend({}, {include: ['roles']}, internal);

    return models.User.findAll(options).then(function (_users) {
        _users.forEach(function (user) {
            users.all[user.get('email')] = {realId: user.get('id')};
            if (user.related('roles').toJSON(options)[0] && user.related('roles').toJSON(options)[0].name === 'Owner') {
                users.owner = user.toJSON(options);
            }
        });

        if (!users.owner) {
            return Promise.reject(i18n.t('errors.data.import.dataImporter.unableToFindOwner'));
        }

        return users;
    });
};

DataImporter.prototype.doUserImport = function (t, tableData, owner, users, errors, roles) {
    var userOps = [],
        imported = [];

    if (tableData.users && tableData.users.length) {
        if (tableData.roles_users && tableData.roles_users.length) {
            tableData = utils.preProcessRolesUsers(tableData, owner, roles);
        }

        // Import users, deduplicating with already present users
        userOps = utils.importUsers(tableData.users, users, t).map(function (userImport) {
            return userImport.reflect();
        });

        return Promise.all(userOps).then(function (descriptors) {
            descriptors.forEach(function (d) {
                if (!d.isFulfilled()) {
                    errors = errors.concat(d.reason());
                } else {
                    imported.push(d.value().toJSON(internal));
                }
            });

            // If adding the users fails,
            if (errors.length > 0) {
                t.rollback(errors);
            } else {
                return imported;
            }
        });
    }

    return Promise.resolve({});
};

DataImporter.prototype.doImport = function (data) {
    var self = this,
        tableData = data.data,
        imported = {},
        errors = [],
        users = {},
        owner = {}, roles = {};

    return self.loadRoles().then(function (_roles) {
        roles = _roles;

        return self.loadUsers().then(function (result) {
            owner = result.owner;
            users = result.all;

            return models.Base.transaction(function (t) {
                // Step 1: Attempt to handle adding new users
                self.doUserImport(t, tableData, owner, users, errors, roles).then(function (result) {
                    var importResults = [];

                    imported.users = result;

                    _.each(imported.users, function (user) {
                        users[user.email] = {realId: user.id};
                    });

                    // process user data - need to figure out what users we have available for assigning stuff to etc
                    try {
                        tableData = utils.processUsers(tableData, owner, users, ['posts', 'tags']);
                    } catch (error) {
                        return t.rollback([error]);
                    }

                    // Do any pre-processing of relationships (we can't depend on ids)
                    if (tableData.posts_tags && tableData.posts && tableData.tags) {
                        tableData = utils.preProcessPostTags(tableData);
                    }

                    // Import things in the right order

                    return utils.importTags(tableData.tags, t).then(function (results) {
                        if (results) {
                            importResults = importResults.concat(results);
                        }

                        return utils.importPosts(tableData.posts, t);
                    }).then(function (results) {
                        if (results) {
                            importResults = importResults.concat(results);
                        }

                        return utils.importSettings(tableData.settings, t);
                    }).then(function (results) {
                        if (results) {
                            importResults = importResults.concat(results);
                        }
                    }).then(function () {
                        importResults.forEach(function (p) {
                            if (!p.isFulfilled()) {
                                errors = errors.concat(p.reason());
                            }
                        });

                        if (errors.length === 0) {
                            t.commit();
                        } else {
                            t.rollback(errors);
                        }
                    });

                    /** do nothing with these tables, the data shouldn't have changed from the fixtures
                     *   permissions
                     *   roles
                     *   permissions_roles
                     *   permissions_users
                     */
                });
            }).then(function () {
                // TODO: could return statistics of imported items
                return Promise.resolve();
            });
        });
    });
};

module.exports = {
    DataImporter: DataImporter,
    importData: function (data) {
        return new DataImporter().importData(data);
    }
};
