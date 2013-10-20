var when      = require('when'),
    _         = require('underscore'),
    migration = require('../migration'),
    client    = require('../../models/base').client,
    knex      = require('../../models/base').knex,

    exporter;

function getTablesFromSqlite3() {
    return knex.raw("select * from sqlite_master where type = 'table'").then(function (response) {
        return _.reject(_.pluck(response[0], 'tbl_name'), function (name) {
            return name === 'sqlite_sequence';
        });
    });
}

function getTablesFromMySQL() {
    return knex.raw("show tables").then(function (response) {
        return _.flatten(_.map(response[0], function (entry) {
            return _.values(entry);
        }));
    });
}

exporter = function () {
    var tablesToExport;

    if (client === 'sqlite3') {
        tablesToExport = getTablesFromSqlite3();
    } else if (client === 'mysql') {
        tablesToExport = getTablesFromMySQL();
    } else {
        return when.reject("No exporter for database client " + client);
    }

    return when.join(migration.getDatabaseVersion(), tablesToExport).then(function (results) {
        var version = results[0],
            tables = results[1],
            selectOps = _.map(tables, function (name) {
                return knex(name).select();
            });

        return when.all(selectOps).then(function (tableData) {
            var exportData = {
                meta: {
                    exported_on: new Date().getTime(),
                    version: version
                },
                data: {
                    // Filled below
                }
            };

            _.each(tables, function (name, i) {
                exportData.data[name] = tableData[i];
            });

            return when.resolve(exportData);
        }, function (err) {
            console.log("Error exporting data: " + err);
        });
    });
};

module.exports = exporter;