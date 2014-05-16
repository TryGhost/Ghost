var _          = require('lodash'),
    when       = require('when'),
    versioning = require('../versioning'),
    config     = require('../../config'),
    utils      = require('../utils'),

    excludedTables = ['sessions'],
    exporter;

exporter = function () {
    return when.join(versioning.getDatabaseVersion(), utils.getTables()).then(function (results) {
        var version = results[0],
            tables = results[1],
            selectOps = _.map(tables, function (name) {
                if (excludedTables.indexOf(name) < 0) {
                    return config().database.knex(name).select();
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
        }).catch(function (err) {
            console.log('Error exporting data: ' + err);
        });
    });
};

module.exports = exporter;
