var _               = require('lodash'),
    when            = require('when'),
    path            = require('path'),
    fs              = require('fs'),
    nodefn          = require('when/node/function'),
    errors          = require('../../errors'),
    client          = require('../../models/base').client,
    knex            = require('../../models/base').knex,
    sequence        = require('when/sequence'),

    versioning      = require('../versioning'),
    Settings        = require('../../models/settings').Settings,
    fixtures        = require('../fixtures'),
    schema          = require('../schema').tables,
    dataExport      = require('../export'),
    utils           = require('../utils'),

    schemaTables    = _.keys(schema),

    init,
    reset,
    migrateUp,
    migrateUpFreshDb;

function getDeleteCommands(oldTables, newTables) {
    var deleteTables = _.difference(oldTables, newTables);
    if (!_.isEmpty(deleteTables)) {
        return _.map(deleteTables, function (table) {
            return function () {
                return utils.deleteTable(table);
            };
        });
    }
}

function getAddCommands(oldTables, newTables) {
    var addTables = _.difference(newTables, oldTables);
    if (!_.isEmpty(addTables)) {
        return _.map(addTables, function (table) {
            return function () {
                return utils.createTable(table);
            };
        });
    }
}

function addColumnCommands(table, columns) {
    var columnKeys = _.keys(schema[table]),
        addColumns = _.difference(columnKeys, columns);
    
    return _.map(addColumns, function (column) {
        return function () {
            utils.addColumn(table, column);
        };
    });
}

function modifyUniqueCommands(table, indexes) {
    var columnKeys = _.keys(schema[table]);
    return _.map(columnKeys, function (column) {
        if (schema[table][column].unique && schema[table][column].unique === true) {
            if (!_.contains(indexes, table + '_' + column + '_unique')) {
                return function () {
                    return utils.addUnique(table, column);
                };
            }
        } else if (!schema[table][column].unique) {
            if (_.contains(indexes, table + '_' + column + '_unique')) {
                return function () {
                    return utils.dropUnique(table, column);
                };
            }
        }
    });
}

// Check for whether data is needed to be bootstrapped or not
init = function () {
    var self = this;
    // There are 4 possibilities:
    // 1. The database exists and is up-to-date
    // 2. The database exists but is out of date
    // 3. The database exists but the currentVersion setting does not or cannot be understood
    // 4. The database has not yet been created
    return versioning.getDatabaseVersion().then(function (databaseVersion) {
        var defaultVersion = versioning.getDefaultDatabaseVersion();
        if (databaseVersion === defaultVersion) {
            // 1. The database exists and is up-to-date
            return when.resolve();
        }
        if (databaseVersion < defaultVersion) {
            // 2. The database exists but is out of date
            // Migrate to latest version
            return self.migrateUp().then(function () {
                // Finally update the databases current version
                return versioning.setDatabaseVersion();
            });
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
            return self.migrateUpFreshDb();
        }
        // 3. The database exists but the currentVersion setting does not or cannot be understood
        // In this case the setting was missing or there was some other problem
        errors.logErrorAndExit('There is a problem with the database', err.message || err);
    });
};

// ### Reset
// Delete all tables from the database in reverse order
reset = function () {
    var tables = [];
    tables = _.map(schemaTables, function (table) {
        return function () {
            return utils.deleteTable(table);
        };
    }).reverse();

    return sequence(tables);
};

// Only do this if we have no database at all
migrateUpFreshDb = function () {
    var tables = [];
    tables = _.map(schemaTables, function (table) {
        return function () {
            return utils.createTable(table);
        };
    });

    return sequence(tables).then(function () {
        // Load the fixtures
        return fixtures.populateFixtures().then(function () {
            // Initialise the default settings
            return Settings.populateDefaults();
        });
    });
};

// This function changes the type of posts.html and posts.markdown columns to mediumtext. Due to
// a wrong datatype in schema.js some installations using mysql could have been created using the
// data type text instead of mediumtext.
// For details see: https://github.com/TryGhost/Ghost/issues/1947 
function checkMySQLPostTable() {
    return knex.raw("SHOW FIELDS FROM posts where Field ='html' OR Field = 'markdown'").then(function (response) {
        return _.flatten(_.map(response[0], function (entry) {
            if (entry.Type.toLowerCase() !== 'mediumtext') {
                return knex.raw("ALTER TABLE posts MODIFY " + entry.Field + " MEDIUMTEXT").then(function () {
                    return when.resolve();
                });
            }
        }));
    });
}

function backupDatabase() {
    return dataExport().then(function (exportedData) {
        // Save the exported data to the file system for download
        var fileName = path.resolve(__dirname + '/../exported-' + (new Date().getTime()) + '.json');

        return nodefn.call(fs.writeFile, fileName, JSON.stringify(exportedData));
    });
}

// Migrate from a specific version to the latest
migrateUp = function () {
    var deleteCommands,
        addCommands,
        oldTables,
        addColumns = [],
        modifyUniCommands = [],
        commands = [];

    return backupDatabase().then(function () {
        return utils.getTables().then(function (tables) {
            oldTables = tables;
        });
    }).then(function () {
        // if tables exist and client is mysqls check if posts table is okay
        if (!_.isEmpty(oldTables) && client === 'mysql') {
            return checkMySQLPostTable();
        }
    }).then(function () {
        deleteCommands = getDeleteCommands(oldTables, schemaTables);
        addCommands = getAddCommands(oldTables, schemaTables);
        return when.all(
            _.map(oldTables, function (table) {
                return utils.getIndexes(table).then(function (indexes) {
                    modifyUniCommands = modifyUniCommands.concat(modifyUniqueCommands(table, indexes));
                });
            })
        );
    }).then(function () {
        return when.all(
            _.map(oldTables, function (table) {
                return utils.getColumns(table).then(function (columns) {
                    addColumns = addColumns.concat(addColumnCommands(table, columns));
                });
            })
        );

    }).then(function () {
        modifyUniCommands = _.compact(modifyUniCommands);

        // delete tables
        if (!_.isEmpty(deleteCommands)) {
            commands = commands.concat(deleteCommands);
        }
        // add tables
        if (!_.isEmpty(addCommands)) {
            commands = commands.concat(addCommands);
        }
        // add columns if needed
        if (!_.isEmpty(addColumns)) {
            commands = commands.concat(addColumns);
        }
        // add/drop unique constraint
        if (!_.isEmpty(modifyUniCommands)) {
            commands = commands.concat(modifyUniCommands);
        }
        // execute the commands in sequence
        if (!_.isEmpty(commands)) {
            return sequence(commands);
        }
        return;
    }).then(function () {
        return fixtures.updateFixtures();
    });
};

module.exports = {
    init: init,
    reset: reset,
    migrateUp: migrateUp,
    migrateUpFreshDb: migrateUpFreshDb
};