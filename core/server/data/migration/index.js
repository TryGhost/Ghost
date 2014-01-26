var _               = require('underscore'),
    when            = require('when'),
    errors          = require('../../errorHandling'),
    client          = require('../../models/base').client,
    knex            = require('../../models/base').knex,
    sequence        = require('when/sequence'),

    defaultSettings = require('../default-settings'),
    Settings        = require('../../models/settings').Settings,
    fixtures        = require('../fixtures'),
    schema          = require('../schema').tables,

    initialVersion  = '000',
    schemaTables    = _.keys(schema),
    defaultDatabaseVersion,

    init,
    reset,
    migrateUp,
    migrateUpFreshDb,
    getTables;

// Default Database Version
// The migration version number according to the hardcoded default settings
// This is the version the database should be at or migrated to
function getDefaultDatabaseVersion() {
    if (!defaultDatabaseVersion) {
        // This be the current version according to the software
        defaultDatabaseVersion = _.find(defaultSettings.core, function (setting) {
            return setting.key === 'databaseVersion';
        }).defaultValue;
    }

    return defaultDatabaseVersion;
}

// Database Current Version
// The migration version number according to the database
// This is what the database is currently at and may need to be updated
function getDatabaseVersion() {
    return knex.schema.hasTable('settings').then(function (exists) {
        // Check for the current version from the settings table
        if (exists) {
            // Temporary code to deal with old databases with currentVersion settings
            return knex('settings')
                .where('key', 'databaseVersion')
                .orWhere('key', 'currentVersion')
                .select('value')
                .then(function (versions) {
                    var databaseVersion = _.reduce(versions, function (memo, version) {
                        if (isNaN(version.value)) {
                            errors.throwError('Database version is not recognised');
                        }
                        return parseInt(version.value, 10) > parseInt(memo, 10) ? version.value : memo;
                    }, initialVersion);

                    if (!databaseVersion || databaseVersion.length === 0) {
                        // we didn't get a response we understood, assume initialVersion
                        databaseVersion = initialVersion;
                    }

                    return databaseVersion;
                });
        }
        throw new Error('Settings table does not exist');
    });
}

function setDatabaseVersion() {
    return knex('settings')
        .where('key', 'databaseVersion')
        .update({ 'value': defaultDatabaseVersion });
}

function createTable(table) {
    return knex.schema.createTable(table, function (t) {
        var column,
            columnKeys = _.keys(schema[table]);
        _.each(columnKeys, function (key) {
            // creation distinguishes between text with fieldtype, string with maxlength and all others
            if (schema[table][key].type === 'text' && schema[table][key].hasOwnProperty('fieldtype')) {
                column = t[schema[table][key].type](key, schema[table][key].fieldtype);
            } else if (schema[table][key].type === 'string' && schema[table][key].hasOwnProperty('maxlength')) {
                column = t[schema[table][key].type](key, schema[table][key].maxlength);
            } else {
                column = t[schema[table][key].type](key);
            }

            if (schema[table][key].hasOwnProperty('nullable') && schema[table][key].nullable === true) {
                column.nullable();
            } else {
                column.notNullable();
            }
            if (schema[table][key].hasOwnProperty('primary') && schema[table][key].primary === true) {
                column.primary();
            }
            if (schema[table][key].hasOwnProperty('unique') && schema[table][key].unique) {
                column.unique();
            }
            if (schema[table][key].hasOwnProperty('unsigned') && schema[table][key].unsigned) {
                column.unsigned();
            }
            if (schema[table][key].hasOwnProperty('references') && schema[table][key].hasOwnProperty('inTable')) {
                //check if table exists?
                column.references(schema[table][key].references);
                column.inTable(schema[table][key].inTable);
            }
            if (schema[table][key].hasOwnProperty('defaultTo')) {
                column.defaultTo(schema[table][key].defaultTo);
            }
        });
    });
}

function deleteTable(table) {
    return knex.schema.dropTableIfExists(table);
}

function getDeleteCommands(oldTables, newTables) {
    var deleteTables = _.difference(oldTables, newTables);
    if (!_.isEmpty(deleteTables)) {
        return _.map(deleteTables, function (table) {
            return function () {
                return deleteTable(table);
            };
        });
    }
}

function getAddCommands(oldTables, newTables) {
    var addTables = _.difference(newTables, oldTables);
    if (!_.isEmpty(addTables)) {
        return _.map(addTables, function (table) {
            return function () {
                return createTable(table);
            };
        });
    }
}

function getTablesFromSqlite3() {
    return knex.raw("select * from sqlite_master where type = 'table'").then(function (response) {
        return _.reject(_.pluck(response[0], 'tbl_name'), function (name) {
            return name === 'sqlite_sequence';
        });
    });
}

function getTablesFromPgSQL() {
    return knex.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").then(function (response) {
        return _.flatten(_.pluck(response.rows, 'table_name'));
    });
}

function getTablesFromMySQL() {
    return knex.raw("show tables").then(function (response) {
        return _.flatten(_.map(response[0], function (entry) {
            return _.values(entry);
        }));
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
    return getDatabaseVersion().then(function (databaseVersion) {
        var defaultVersion = getDefaultDatabaseVersion();
        if (databaseVersion === defaultVersion) {
            // 1. The database exists and is up-to-date
            return when.resolve();
        }
        if (databaseVersion < defaultVersion) {
            // 2. The database exists but is out of date
            // Migrate to latest version
            return self.migrateUp().then(function () {
                // Finally update the databases current version
                return setDatabaseVersion();
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
            return deleteTable(table);
        };
    }).reverse();

    return sequence(tables);
};

// Only do this if we have no database at all
migrateUpFreshDb = function () {
    var tables = [];
    tables = _.map(schemaTables, function (table) {
        return function () {
            return createTable(table);
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

// Migrate from a specific version to the latest
migrateUp = function () {
    return getTables().then(function (oldTables) {
        // if tables exist and lient is mysqls check if posts table is okay
        if (!_.isEmpty(oldTables) && client === 'mysql') {
            return checkMySQLPostTable().then(function () {
                return oldTables;
            });
        }
        return oldTables;
    }).then(function (oldTables) {
        var deleteCommands = getDeleteCommands(oldTables, schemaTables),
            addCommands = getAddCommands(oldTables, schemaTables),
            commands = [];

        if (!_.isEmpty(deleteCommands)) {
            commands = commands.concat(deleteCommands);
        }
        if (!_.isEmpty(addCommands)) {
            commands = commands.concat(addCommands);
        }
        if (!_.isEmpty(commands)) {
            return sequence(commands);
        }
        return;
    });
};

getTables = function () {
    if (client === 'sqlite3') {
        return getTablesFromSqlite3();
    }
    if (client === 'mysql') {
        return getTablesFromMySQL();
    }
    if (client === 'pg') {
        return getTablesFromPgSQL();
    }
    return when.reject("No support for database client " + client);
};

module.exports = {
    getDatabaseVersion: getDatabaseVersion,
    init: init,
    reset: reset,
    migrateUp: migrateUp,
    migrateUpFreshDb: migrateUpFreshDb
};