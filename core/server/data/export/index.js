var _           = require('lodash'),
    when        = require('when'),

    versioning  = require('../versioning'),
    config      = require('../../config'),
    utils       = require('../utils'),
    serverUtils = require('../../utils'),
    errors      = require('../../errors'),
    settings    = require('../../api/settings'),
    uuid        = require('node-uuid'),

    excludedTables = ['accesstokens', 'refreshtokens', 'clients'],
    exporter,
    exportFileName,
    ensureNewUUID;

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
                if (name === 'posts') {
                    var checkedUUIDdata = ensureNewUUID(tableData[i]);
                    exportData.data[name] = checkedUUIDdata;
                } else {
                    exportData.data[name] = tableData[i];
                }
            });

            return when.resolve(exportData);
        }).catch(function (err) {
            errors.logAndThrowError(err, 'Error exporting data', '');
        });
    });
};

// If the post has an old UUID format (eg '52825818238f7'), we'll create a new 
// UUID using uuid.v4() and the creation timestamp as basis.
// This is necessary to make the data consumable for the Ghost importer >0.5
ensureNewUUID = function (data) {
    _.each(data, function (name, i) {
        if (data[i].uuid && data[i].uuid.length === 13) {
            data[i].uuid = uuid.v4({ msecs: data[i].created_at });
        }
    });
    return data;
};

module.exports = exporter;
module.exports.fileName = exportFileName;
