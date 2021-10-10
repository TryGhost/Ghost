const _ = require('lodash');
const Promise = require('bluebird');
const db = require('../../data/db');
const commands = require('../schema').commands;
const ghostVersion = require('@tryghost/version');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    errorExportingData: 'Error exporting data'
};

const {
    TABLES_ALLOWLIST,
    SETTING_KEYS_BLOCKLIST
} = require('./table-lists');

const exportTable = function exportTable(tableName, options) {
    if (TABLES_ALLOWLIST.includes(tableName) ||
        (options.include && _.isArray(options.include) && options.include.indexOf(tableName) !== -1)) {
        const query = (options.transacting || db.knex)(tableName);

        return query.select();
    }
};

const getSettingsTableData = function getSettingsTableData(settingsData) {
    return settingsData && settingsData.filter((setting) => {
        return !SETTING_KEYS_BLOCKLIST.includes(setting.key);
    });
};

const doExport = async function doExport(options) {
    options = options || {include: []};

    try {
        const tables = await commands.getTables(options.transacting);

        const tableData = await Promise.mapSeries(tables, function (tableName) {
            return exportTable(tableName, options);
        });

        const exportData = {
            meta: {
                exported_on: new Date().getTime(),
                version: ghostVersion.full
            },
            data: {
                // Filled below
            }
        };

        tables.forEach((name, i) => {
            if (name === 'settings') {
                exportData.data[name] = getSettingsTableData(tableData[i]);
            } else {
                exportData.data[name] = tableData[i];
            }
        });

        return exportData;
    } catch (err) {
        throw new errors.DataExportError({
            err: err,
            context: tpl(messages.errorExportingData)
        });
    }
};

module.exports = doExport;
