const _ = require('lodash');
const Promise = require('bluebird');
const db = require('../../data/db');
const commands = require('../schema').commands;
const ghostVersion = require('../../lib/ghost-version');
const {i18n} = require('../../lib/common');
const logging = require('../../../shared/logging');
const errors = require('@tryghost/errors');
const security = require('@tryghost/security');
const models = require('../../models');
const EXCLUDED_TABLES = ['sessions', 'mobiledoc_revisions', 'email_batches', 'email_recipients'];
const EXCLUDED_SETTING_KEYS = [
    'stripe_connect_publishable_key',
    'stripe_connect_secret_key',
    'stripe_connect_account_id',
    'stripe_secret_key',
    'stripe_publishable_key',
    'members_stripe_webhook_id',
    'members_stripe_webhook_secret'
];

const modelOptions = {context: {internal: true}};

const exportFileName = function exportFileName(options) {
    const datetime = require('moment')().format('YYYY-MM-DD-HH-mm-ss');
    let title = '';

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
        logging.error(new errors.GhostError({err: err}));
        return 'ghost.' + datetime + '.json';
    });
};

const getVersionAndTables = function getVersionAndTables(options) {
    const props = {
        version: ghostVersion.full,
        tables: commands.getTables(options.transacting)
    };

    return Promise.props(props);
};

const exportTable = function exportTable(tableName, options) {
    if (EXCLUDED_TABLES.indexOf(tableName) < 0 ||
        (options.include && _.isArray(options.include) && options.include.indexOf(tableName) !== -1)) {
        const query = (options.transacting || db.knex)(tableName);

        return query.select();
    }
};

const getSettingsTableData = function getSettingsTableData(settingsData) {
    return settingsData && settingsData.filter((setting) => {
        return !EXCLUDED_SETTING_KEYS.includes(setting.key);
    });
};

const doExport = function doExport(options) {
    options = options || {include: []};

    let tables;
    let version;

    return getVersionAndTables(options).then(function exportAllTables(result) {
        tables = result.tables;
        version = result.version;

        return Promise.mapSeries(tables, function (tableName) {
            return exportTable(tableName, options);
        });
    }).then(function formatData(tableData) {
        const exportData = {
            meta: {
                exported_on: new Date().getTime(),
                version: version
            },
            data: {
                // Filled below
            }
        };

        _.each(tables, function (name, i) {
            if (name === 'settings') {
                exportData.data[name] = getSettingsTableData(tableData[i]);
            } else {
                exportData.data[name] = tableData[i];
            }
        });

        return exportData;
    }).catch(function (err) {
        return Promise.reject(new errors.DataExportError({
            err: err,
            context: i18n.t('errors.data.export.errorExportingData')
        }));
    });
};

module.exports = {
    doExport: doExport,
    fileName: exportFileName,
    EXCLUDED_TABLES: EXCLUDED_TABLES
};
