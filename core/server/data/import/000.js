var when   = require('when'),
    _      = require('lodash'),
    models = require('../../models'),
    utils  = require('./utils'),

    Importer000;


Importer000 = function () {
    _.bindAll(this, 'basicImport');

    this.version = '000';

    this.importFrom = {
        '000': this.basicImport,
        '001': this.basicImport,
        '002': this.basicImport,
        '003': this.basicImport
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

    return when.reject('Unsupported version of data: ' + data.meta.version);
};

// No data needs modifying, we just import whatever tables are available
Importer000.prototype.basicImport = function (data) {
    var ops = [],
        tableData = data.data;
    return models.Base.transaction(function (t) {

        // Do any pre-processing of relationships (we can't depend on ids)
        if (tableData.posts_tags && tableData.posts && tableData.tags) {
            tableData = utils.preProcessPostTags(tableData);
        }

        // Import things in the right order:
        if (tableData.tags && tableData.tags.length) {
            utils.importTags(ops, tableData.tags, t);
        }

        if (tableData.posts && tableData.posts.length) {
            utils.importPosts(ops, tableData.posts, t);
        }

        // If we only have 1 user, behave as we always have done, overwriting properties,
        // Else attempt to import users like any other resource, failing if there are clashes
        if (tableData.users && tableData.users.length && tableData.users.length > 1) {
            if (tableData.roles_users && tableData.roles_users.length) {
                tableData = utils.preProcessRolesUsers(tableData);
            }

            utils.importUsers(ops, tableData.users, t);
        } else if (tableData.users && tableData.users.length) {
            utils.importSingleUser(ops, tableData.users, t);
        }

        if (tableData.settings && tableData.settings.length) {
            utils.importSettings(ops, tableData.settings, t);
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
            var errors = [];

            descriptors.forEach(function (d) {
                if (d.state === 'rejected') {
                    errors = errors.concat(d.reason);
                }
            });

            if (errors.length === 0) {
                t.commit();
            } else {
                t.rollback(errors);
            }
        });
    }).then(function () {
        //TODO: could return statistics of imported items
        return when.resolve();
    }, function (errors) {
        return when.reject(errors);
    });
};

module.exports = {
    Importer000: Importer000,
    importData: function (data) {
        return new Importer000().importData(data);
    }
};
