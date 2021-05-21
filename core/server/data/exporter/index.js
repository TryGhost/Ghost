const _ = require('lodash');
const Promise = require('bluebird');
const db = require('../../data/db');
const commands = require('../schema').commands;
const ghostVersion = require('../../lib/ghost-version');
const i18n = require('../../../shared/i18n');
const logging = require('../../../shared/logging');
const errors = require('@tryghost/errors');
const security = require('@tryghost/security');
const models = require('../../models');
const {
    BACKUP_TABLES,
    TABLES_ALLOWLIST,
    SETTING_KEYS_BLOCKLIST
} = require('./table-lists');

const modelOptions = {context: {internal: true}};

const exportFileName = async function exportFileName(options) {
    const datetime = require('moment')().format('YYYY-MM-DD-HH-mm-ss');
    let title = '';

    options = options || {};

    // custom filename
    if (options.filename) {
        return options.filename + '.json';
    }

    try {
        const settingsTitle = await models.Settings.findOne({key: 'title'}, _.merge({}, modelOptions, _.pick(options, 'transacting')));

        if (settingsTitle) {
            title = security.string.safe(settingsTitle.get('value')) + '.';
        }

        return title + 'ghost.' + datetime + '.json';
    } catch (err) {
        logging.error(new errors.GhostError({err: err}));
        return 'ghost.' + datetime + '.json';
    }
};

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
            context: i18n.t('errors.data.export.errorExportingData')
        });
    }
};

module.exports = {
    doExport: doExport,
    fileName: exportFileName,
    BACKUP_TABLES: BACKUP_TABLES
};
