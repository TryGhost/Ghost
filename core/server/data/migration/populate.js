// # Populate
// Create a brand new database for a new install of ghost
var Promise = require('bluebird'),
    _ = require('lodash'),
    commands = require('../schema').commands,
    versioning = require('../schema').versioning,
    fixtures = require('./fixtures'),
    db = require('../../data/db'),
    logging = require('../../logging'),
    models = require('../../models'),
    errors = require('../../errors'),
    schema = require('../schema').tables,
    schemaTables = Object.keys(schema),
    populate, logger;

logger = {
    info: function info(message) {
        logging.info('Migrations:' + message);
    },
    warn: function warn(message) {
        logging.warn('Skipping Migrations:' + message);
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

    return db.knex.transaction(function populateDatabaseInTransaction(transaction) {
        return Promise.mapSeries(schemaTables, function createTable(table) {
            logger.info('Creating table: ' + table);
            return commands.createTable(table, transaction);
        }).then(function () {
            // @TODO:
            //  - key: migrations-kate
            //  - move to seed
            return models.Settings.populateDefaults(_.merge({}, {transacting: transaction}, modelOptions));
        }).then(function () {
            // @TODO:
            //  - key: migrations-kate
            //  - move to seed
            return versioning.setDatabaseVersion(transaction);
        }).then(function populateFixtures() {
            if (tablesOnly) {
                return;
            }

            return fixtures.populate(logger, _.merge({}, {transacting: transaction}, modelOptions));
        });
    }).catch(function populateDatabaseError(err) {
        logger.warn('rolling back...');
        return Promise.reject(new errors.GhostError({err: err, context: 'Unable to populate database!'}));
    });
};

module.exports = populate;
