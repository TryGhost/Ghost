// # Populate
// Create a brand new database for a new install of ghost
var Promise  = require('bluebird'),
    commands = require('../schema').commands,
    fixtures = require('./fixtures'),
    schema   = require('../schema').tables,

    schemaTables = Object.keys(schema),
    populate;

/**
 * ## Populate
 * Uses the schema to determine table structures, and automatically creates each table in order
 * TODO: use this directly in tests, so migration.init() can forget about tablesOnly as an option
 *
 * @param {Function} logInfo
 * @param {Boolean} [tablesOnly] - used by tests
 * @returns {Promise<*>}
 */
populate = function populate(logInfo, tablesOnly) {
    logInfo('Creating tables...');

    var tableSequence = Promise.mapSeries(schemaTables, function createTable(table) {
        logInfo('Creating table: ' + table);
        return commands.createTable(table);
    });

    if (tablesOnly) {
        return tableSequence;
    }

    return tableSequence.then(function () {
        // Load the fixtures
        return fixtures.populate(logInfo);
    }).then(function () {
        return fixtures.ensureDefaultSettings(logInfo);
    });
};

module.exports = populate;
