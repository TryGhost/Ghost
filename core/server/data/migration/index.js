var _               = require('lodash'),
    Promise         = require('bluebird'),
    crypto          = require('crypto'),
    sequence        = require('../../utils/sequence'),
    path            = require('path'),
    fs              = require('fs'),
    errors          = require('../../errors'),
    commands        = require('./commands'),
    versioning      = require('../versioning'),
    models          = require('../../models'),
    fixtures        = require('../fixtures'),
    schema          = require('../schema').tables,
    dataExport      = require('../export'),
    utils           = require('../utils'),
    config          = require('../../config'),

    schemaTables    = _.keys(schema),

    // private
    logInfo,
    populateDefaultSettings,
    backupDatabase,
    fixClientSecret,

    // public
    init,
    reset,
    migrateUp,
    migrateUpFreshDb;

logInfo = function logInfo(message) {
    errors.logInfo('Migrations', message);
};

populateDefaultSettings = function populateDefaultSettings() {
    // Initialise the default settings
    logInfo('Populating default settings');
    return models.Settings.populateDefaults().then(function () {
        logInfo('Complete');
    });
};

backupDatabase = function backupDatabase() {
    logInfo('Creating database backup');
    return dataExport().then(function (exportedData) {
        // Save the exported data to the file system for download
        return dataExport.fileName().then(function (fileName) {
            fileName = path.resolve(config.paths.contentPath + '/data/' + fileName);

            return Promise.promisify(fs.writeFile)(fileName, JSON.stringify(exportedData)).then(function () {
                logInfo('Database backup written to: ' + fileName);
            });
        });
    });
};

// TODO: move to migration.to005() for next DB version
fixClientSecret = function () {
    return models.Clients.forge().query('where', 'secret', '=', 'not_available').fetch().then(function updateClients(results) {
        return Promise.map(results.models, function mapper(client) {
            if (process.env.NODE_ENV.indexOf('testing') !== 0) {
                logInfo('Updating client secret');
                client.secret = crypto.randomBytes(6).toString('hex');
            }
            return models.Client.edit(client, {context: {internal: true}, id: client.id});
        });
    });
};

// Check for whether data is needed to be bootstrapped or not
init = function (tablesOnly) {
    tablesOnly = tablesOnly || false;

    var self = this;
    // There are 4 possibilities:
    // 1. The database exists and is up-to-date
    // 2. The database exists but is out of date
    // 3. The database exists but the currentVersion setting does not or cannot be understood
    // 4. The database has not yet been created
    return versioning.getDatabaseVersion().then(function (databaseVersion) {
        var defaultVersion = versioning.getDefaultDatabaseVersion();

        if (databaseVersion < defaultVersion || process.env.FORCE_MIGRATION) {
            // 2. The database exists but is out of date
            // Migrate to latest version
            logInfo('Database upgrade required from version ' + databaseVersion + ' to ' +  defaultVersion);
            return self.migrateUp(databaseVersion, defaultVersion).then(function () {
                // Finally update the databases current version
                return versioning.setDatabaseVersion();
            });
        }

        if (databaseVersion === defaultVersion) {
            // 1. The database exists and is up-to-date
            logInfo('Up to date at version ' + databaseVersion);
            // TODO: temporary fix for missing client.secret
            return fixClientSecret();
        }

        if (databaseVersion > defaultVersion) {
            // 3. The database exists but the currentVersion setting does not or cannot be understood
            // In this case we don't understand the version because it is too high
            errors.logErrorAndExit(
                'Your database is not compatible with this version of Ghost',
                'You will need to create a new database'
            );
        }
    }, function (err) {
        if (err.message || err === 'Settings table does not exist') {
            // 4. The database has not yet been created
            // Bring everything up from initial version.
            logInfo('Database initialisation required for version ' + versioning.getDefaultDatabaseVersion());
            return self.migrateUpFreshDb(tablesOnly);
        }
        // 3. The database exists but the currentVersion setting does not or cannot be understood
        // In this case the setting was missing or there was some other problem
        errors.logErrorAndExit('There is a problem with the database', err.message || err);
    });
};

// ### Reset
// Delete all tables from the database in reverse order
reset = function () {
    var tables = _.map(schemaTables, function (table) {
        return function () {
            return utils.deleteTable(table);
        };
    }).reverse();

    return sequence(tables);
};

// Only do this if we have no database at all
migrateUpFreshDb = function (tablesOnly) {
    var tableSequence,
        tables = _.map(schemaTables, function (table) {
            return function () {
                logInfo('Creating table: ' + table);
                return utils.createTable(table);
            };
        });
    logInfo('Creating tables...');
    tableSequence = sequence(tables);

    if (tablesOnly) {
        return tableSequence;
    }
    return tableSequence.then(function () {
        // Load the fixtures
        return fixtures.populate();
    }).then(function () {
        return populateDefaultSettings();
    });
};

// Migrate from a specific version to the latest
migrateUp = function (fromVersion, toVersion) {
    var oldTables,
        modifyUniCommands = [],
        migrateOps = [];

    return backupDatabase().then(function () {
        return utils.getTables();
    }).then(function (tables) {
        oldTables = tables;
        if (!_.isEmpty(oldTables)) {
            return utils.checkTables();
        }
    }).then(function () {
        migrateOps = migrateOps.concat(commands.getDeleteCommands(oldTables, schemaTables));
        migrateOps = migrateOps.concat(commands.getAddCommands(oldTables, schemaTables));
        return Promise.all(
            _.map(oldTables, function (table) {
                return utils.getIndexes(table).then(function (indexes) {
                    modifyUniCommands = modifyUniCommands.concat(commands.modifyUniqueCommands(table, indexes));
                });
            })
        );
    }).then(function () {
        return Promise.all(
            _.map(oldTables, function (table) {
                return utils.getColumns(table).then(function (columns) {
                    migrateOps = migrateOps.concat(commands.addColumnCommands(table, columns));
                });
            })
        );
    }).then(function () {
        migrateOps = migrateOps.concat(_.compact(modifyUniCommands));

        // execute the commands in sequence
        if (!_.isEmpty(migrateOps)) {
            logInfo('Running migrations');

            return sequence(migrateOps);
        }
    }).then(function () {
        // Ensure all of the current default settings are created (these are fixtures, so should be inserted first)
        return populateDefaultSettings();
    }).then(function () {
        // Finally, run any updates to the fixtures, including default settings
        return fixtures.update(fromVersion, toVersion);
    });
};

module.exports = {
    init: init,
    reset: reset,
    migrateUp: migrateUp,
    migrateUpFreshDb: migrateUpFreshDb
};
