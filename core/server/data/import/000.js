var Promise = require('bluebird'),
    _       = require('lodash'),
    models  = require('../../models'),
    utils   = require('./utils'),

    Importer000;

Importer000 = function () {
    _.bindAll(this, 'doImport');

    this.version = '000';

    this.importFrom = {
        '000': this.doImport,
        '001': this.doImport,
        '002': this.doImport,
        '003': this.doImport
    };
};

Importer000.prototype.importData = function (data) {
    return this.canImport(data)
        .then(function (importerFunc) {
            return importerFunc(data);
        });
};

Importer000.prototype.canImport = function (data) {
    if (data.meta && data.meta.version && this.importFrom[data.meta.version]) {
        return Promise.resolve(this.importFrom[data.meta.version]);
    }

    return Promise.reject('Unsupported version of data: ' + data.meta.version);
};

Importer000.prototype.loadUsers = function () {
    var users = {all: {}};

    return models.User.findAll({include: 'roles'}).then(function (_users) {
        _users.forEach(function (user) {
            users.all[user.get('email')] = {realId: user.get('id')};
            if (user.related('roles').toJSON()[0] && user.related('roles').toJSON()[0].name === 'Owner') {
                users.owner = user.toJSON();
            }
        });

        if (!users.owner) {
            return Promise.reject('Unable to find an owner');
        }

        return users;
    });
};

// Importer000.prototype.importerFunction = function (t) {
//
// };

Importer000.prototype.doUserImport = function (t, tableData, users, errors) {
    var userOps = [],
        imported = [];

    if (tableData.users && tableData.users.length) {
        if (tableData.roles_users && tableData.roles_users.length) {
            tableData = utils.preProcessRolesUsers(tableData);
        }

        // Import users, deduplicating with already present users
        userOps = utils.importUsers(tableData.users, users, t);

        return Promise.settle(userOps).then(function (descriptors) {
            descriptors.forEach(function (d) {
                if (d.isRejected()) {
                    errors = errors.concat(d.reason());
                } else {
                    imported.push(d.value().toJSON());
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

Importer000.prototype.doImport = function (data) {
    var self = this,
        tableData = data.data,
        imported = {},
        errors = [],
        users = {},
        owner = {};

    return self.loadUsers().then(function (result) {
        owner = result.owner;
        users = result.all;

        return models.Base.transaction(function (t) {
            // Step 1: Attempt to handle adding new users
            self.doUserImport(t, tableData, users, errors).then(function (result) {
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
                        if (p.isRejected()) {
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
};

module.exports = {
    Importer000: Importer000,
    importData: function (data) {
        return new Importer000().importData(data);
    }
};
