var _          = require('lodash'),
    when       = require('when'),
    versioning = require('../versioning'),
    knex       = require('../../models/base').knex,
    schema     = require('../schema').tables,

    excludedTables = ['sessions'],
    exporter;

exporter = function () {
    var tablesToExport = _.keys(schema);

    return when.join(versioning.getDatabaseVersion(), tablesToExport).then(function (results) {
        var version = results[0],
            tables = results[1],
            selectOps = _.map(tables, function (name) {
                if (excludedTables.indexOf(name) < 0) {
                    return knex(name).select();
                }
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