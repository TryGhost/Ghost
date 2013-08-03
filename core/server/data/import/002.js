var when = require("when"),
    _ = require("underscore"),
    knex = require('../../models/base').Knex,
    errors = require('../../errorHandling'),
    Importer002;

function stripProperties(properties, data) {
    _.each(data, function (obj) {
        _.each(properties, function (property) {
            delete obj[property];
        });
    });
    return data;
}

Importer002 = function () {
    _.bindAll(this, "basicImport");

    this.version = "002";

    this.importFrom = {
        "001": this.basicImport,
        "002": this.basicImport
    };
};

Importer002.prototype.importData = function (data) {
    return this.canImport(data)
        .then(function (importerFunc) {
            return importerFunc(data);
        }, function (reason) {
            return when.reject(reason);
        });
};

Importer002.prototype.canImport = function (data) {
    if (data.meta && data.meta.version && this.importFrom[data.meta.version]) {
        return when.resolve(this.importFrom[data.meta.version]);
    }

    return when.reject("Unsupported version of data");
};

// No data needs modifying, we just import whatever tables are available
Importer002.prototype.basicImport = function (data) {
    var ops = [];

    _.each(data.data, function (tableData, name) {

        switch (name) {
        case 'posts':
            // we want to import all posts as new posts for now
            // TODO: eventually we should be smart about posts which have the same title & content
            // so that we don't create duplicates
            if (tableData && tableData.length) {
                tableData = stripProperties(['id'], tableData);
                ops.push(knex(name).insert(tableData));
            }
            break;
        case 'users':
            // the current data model should only ever have one user.
            // So we update the current one with the first one from the imported data
            if (tableData && tableData.length) {
                tableData = stripProperties(['id'], tableData);
                ops.push(knex(name).where('id', 1)
                    .update(tableData[0]));
            }
            break;
        case 'settings':
            // for settings we need to update individual settings, and insert any missing ones
            // the one setting we MUST NOT update is the currentVersion settings
            var blackList = ['currentVersion'];
            if (tableData && tableData.length) {
                tableData = stripProperties(['id'], tableData);
                _.each(tableData, function (data) {
                    if (blackList.indexOf(data.key) === -1) {
                        ops.push(knex(name).where('key', data.key)
                            .update(data).then(function (success) {
                                // if no lines were updated then we need to insert instead
                                return success === 0 ? knex(name).insert(data) : when.resolve(success);
                            }));
                    }
                });
            }

            break;
        case 'permissions':
        case 'roles':
        case 'permissions_roles':
        case 'permissions_users':
        case 'roles_users':
            // do nothing with these tables, the data shouldn't have changed from the fixtures
            break;
        default:
            // any other tables, if they have data, remove the primary key and insert it
            if (tableData && tableData.length) {
                tableData = stripProperties(['id'], tableData);
                ops.push(knex(name).insert(tableData));
            }
            break;
        }
    });

    return when.all(ops).then(function (results) {
        return when.resolve(results);
    }, function (err) {
        return when.reject("Error importing data: " + err.message || err, err.stack);
    });
};

module.exports = {
    Importer002: Importer002,
    importData: function (data) {
        return new Importer002().importData(data);
    }
};