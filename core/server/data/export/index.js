var _           = require('lodash'),
    when        = require('when'),

    versioning  = require('../versioning'),
    config      = require('../../config'),
    utils       = require('../utils'),
    serverUtils = require('../../utils'),
    errors      = require('../../errors'),
    settings    = require('../../api/settings'),

    excludedTables = ['accesstokens', 'refreshtokens', 'clients'],
    exporter,
    exportFileName;

exportFileName = function () {
    var datetime = (new Date()).toJSON().substring(0, 10),
        title = '';

    return settings.read({key: 'title', context: {internal: true}}).then(function (result) {
        if (result) {
            title = serverUtils.safeString(result.settings[0].value) + '.';
        }
        return title + 'ghost.' + datetime + '.json';
    }).catch(function (err) {
        errors.logError(err);
        return 'ghost.' + datetime + '.json';
    });
};

exporter = function () {
    return when.join(versioning.getDatabaseVersion(), utils.getTables()).then(function (results) {
        var version = results[0],
            tables = results[1],
            selectOps = _.map(tables, function (name) {
                if (excludedTables.indexOf(name) < 0) {
                    return config.database.knex(name).select();
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
            errors.logAndThrowError(err, 'Error exporting data', '');
        });
    });
};

module.exports = exporter;
module.exports.fileName = exportFileName;
