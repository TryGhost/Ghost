// # Populate
// Create a brand new database for a new install of ghost
var Promise = require('bluebird'),
    _ = require('lodash'),
    commands = require('../schema').commands,
    fixtures = require('./fixtures'),
    errors = require('../../errors'),
    db = require('../../data/db'),
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
        };

    logger.info('Creating tables...');

    return new Promise(function populateDatabase(resolve, reject) {
        db.knex.transaction(function populateDatabaseInTransaction(transaction) {
            return Promise.mapSeries(schemaTables, function createTable(table) {
                logger.info('Creating table: ' + table);
                return commands.createTable(table, transaction);
            }).then(function populateFixtures() {
                if (tablesOnly) {
                    return;
                }

                return fixtures.populate(logger, _.merge({}, {transacting: transaction}, modelOptions));
            }).then(function commitTransaction() {
                transaction.commit();
                resolve();
            }).catch(function rollbackTransaction(err) {
                logger.warn('rolling back...');
                return transaction.rollback(err);
            });
        }).catch(function populateDatabaseError(err) {
            reject(err);
        });
    });
};

module.exports = populate;
