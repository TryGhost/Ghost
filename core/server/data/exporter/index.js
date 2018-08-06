var _ = require('lodash'),
    Promise = require('bluebird'),
    db = require('../../data/db'),
    commands = require('../schema').commands,
    ghostVersion = require('../../lib/ghost-version'),
    common = require('../../lib/common'),
    security = require('../../lib/security'),
    models = require('../../models'),
    EXCLUDED_TABLES = ['accesstokens', 'refreshtokens', 'clients', 'client_trusted_domains'],
    EXCLUDED_FIELDS_CONDITIONS = {
        settings: [{
            operator: 'whereNot',
            key: 'key',
            value: 'permalinks'
        }]
    },
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

    options = options || {};

    // custom filename
    if (options.filename) {
        return Promise.resolve(options.filename + '.json');
    }

    return models.Settings.findOne({key: 'title'}, _.merge({}, modelOptions, _.pick(options, 'transacting'))).then(function (result) {
        if (result) {
            title = security.string.safe(result.get('value')) + '.';
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
    if (EXCLUDED_TABLES.indexOf(tableName) < 0 ||
        (options.include && _.isArray(options.include) && options.include.indexOf(tableName) !== -1)) {
        const query = (options.transacting || db.knex)(tableName);

        if (EXCLUDED_FIELDS_CONDITIONS[tableName]) {
            EXCLUDED_FIELDS_CONDITIONS[tableName].forEach((condition) => {
                query[condition.operator](condition.key, condition.value);
            });
        }

        return query.select();
    }
};

doExport = function doExport(options) {
    options = options || {include: []};

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
    fileName: exportFileName,
    EXCLUDED_TABLES: EXCLUDED_TABLES
};
