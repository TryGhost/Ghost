// # Populate
// Create a brand new database for a new install of ghost
var Promise = require('bluebird'),
    commands = require('../schema').commands,
    fixtures = require('./fixtures'),
    errors = require('../../errors'),
    schema = require('../schema').tables,
    schemaTables = Object.keys(schema),
    populate, logger;

// @TODO: remove me asap!
logger = {
    info: function info(message) {
        errors.logComponentInfo('Migrations', message);
    },
    warn: function warn(message) {
        errors.logComponentWarn('Skipping Migrations', message);
    }
};

/**
 * ## Populate
 * Uses the schema to determine table structures, and automatically creates each table in order
 */
populate = function populate(options) {
    options = options || {};

    var tablesOnly = options.tablesOnly,
        modelOptions = {
            context: {
                internal: true
            }
        },
        tableSequence = Promise.mapSeries(schemaTables, function createTable(table) {
            logger.info('Creating table: ' + table);
            return commands.createTable(table);
        });

    logger.info('Creating tables...');

    if (tablesOnly) {
        return tableSequence;
    }

    return tableSequence.then(function () {
        return fixtures.populate(logger, modelOptions);
    });
};

module.exports = populate;
