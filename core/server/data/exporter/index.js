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

// NOTE: these tables can be optionally included to have full db-like export
const BACKUP_TABLES = [
    'actions',
    'api_keys',
    'brute',
    'emails',
    'integrations',
    'invites',
    'labels',
    'members',
    'members_labels',
    'members_stripe_customers',
    'members_stripe_customers_subscriptions',
    'migrations',
    'migrations_lock',
    'permissions',
    'permissions_roles',
    'permissions_users',
    'webhooks',
    'snippets',
    'tokens',
    'sessions',
    'mobiledoc_revisions',
    'email_batches',
    'email_recipients',
    'members_payment_events',
    'members_login_events',
    'members_email_change_events',
    'members_status_events',
    'members_paid_subscription_events',
    'members_subscribe_events'
];

// NOTE: exposing only tables which are going to be included in a "default" export file
//       they should match with the data that is supported by the importer.
//       In the future it's best to move to resource-based exports instead of database-based ones
const TABLES_ALLOWLIST = [
    'posts',
    'posts_authors',
    'posts_meta',
    'posts_tags',
    'roles',
    'roles_users',
    'settings',
    'tags',
    'users'
];

// NOTE: these are settings keys which should never end up in the export file
const SETTING_KEYS_BLOCKLIST = [
    'stripe_connect_publishable_key',
    'stripe_connect_secret_key',
    'stripe_connect_account_id',
    'stripe_secret_key',
    'stripe_publishable_key',
    'members_stripe_webhook_id',
    'members_stripe_webhook_secret'
];

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
