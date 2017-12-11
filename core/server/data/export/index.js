var _ = require('lodash'),
    Promise = require('bluebird'),
    db = require('../../data/db'),
    commands = require('../schema').commands,
    globalUtils = require('../../utils'),
    ghostVersion = require('../../utils/ghost-version'),
    common = require('../../lib/common'),
    models = require('../../models'),
    excludedTables = ['accesstokens', 'refreshtokens', 'clients', 'client_trusted_domains'],
    modelOptions = {context: {internal: true}},

    // private
    getVersionAndTables,
    exportTable,

    // public
    doExport,
    exportFileName;

exportFileName = function exportFileName(options) {
    var datetime = (new Date()).toJSON().substring(0, 10),
        title = '';

    return models.Settings.findOne({key: 'title'}, _.merge({}, modelOptions, options)).then(function (result) {
        if (result) {
            title = globalUtils.safeString(result.get('value')) + '.';
        }

        return title + 'ghost.' + datetime + '.json';
    }).catch(function (err) {
        common.logging.error(new common.errors.GhostError({err: err}));
        return 'ghost.' + datetime + '.json';
    });
};

getVersionAndTables = function getVersionAndTables(options) {
    var props = {
        version: ghostVersion.full,
        tables: commands.getTables(options.transacting)
    };

    return Promise.props(props);
};

exportTable = function exportTable(tableName, options) {
    if (excludedTables.indexOf(tableName) < 0) {
        return (options.transacting || db.knex)(tableName).select();
    }
};

doExport = function doExport(options) {
    options = options || {};

    var tables, version;

    return getVersionAndTables(options).then(function exportAllTables(result) {
        tables = result.tables;
        version = result.version;

        return Promise.mapSeries(tables, function (tableName) {
            return exportTable(tableName, options);
        });
    }).then(function formatData(tableData) {
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

        return exportData;
    }).catch(function (err) {
        return Promise.reject(new common.errors.DataExportError({
            err: err,
            context: common.i18n.t('errors.data.export.errorExportingData')
        }));
    });
};

module.exports = {
    doExport: doExport,
    fileName: exportFileName
};
