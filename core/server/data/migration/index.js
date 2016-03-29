var Promise         = require('bluebird'),
    crypto          = require('crypto'),
    versioning      = require('../schema').versioning,
    errors          = require('../../errors'),
    models          = require('../../models'),

    // private
    logger,
    fixClientSecret,
    populate = require('./populate'),
    update   = require('./update'),

    // public
    init,
    reset    = require('./reset'),
    backup   = require('./backup');

/**
 *
 * @type {{info: logger.info, warn: logger.warn}}
 */
logger = {
    info: function info(message) {
        errors.logComponentInfo('Migrations', message);
    },
    warn: function warn(message) {
        errors.logComponentWarn('Skipping Migrations', message);
    }
};

// TODO: move to migration.to005() for next DB version
fixClientSecret = function () {
    return models.Clients.forge().query('where', 'secret', '=', 'not_available').fetch().then(function updateClients(results) {
        return Promise.map(results.models, function mapper(client) {
            if (process.env.NODE_ENV.indexOf('testing') !== 0) {
                logger.info('Updating client secret');
                client.secret = crypto.randomBytes(6).toString('hex');
            }
            return models.Client.edit(client, {context: {internal: true}, id: client.id});
        });
    });
};

// Check for whether data is needed to be bootstrapped or not
init = function (tablesOnly) {
    tablesOnly = tablesOnly || false;

    // There are 4 possibilities:
    // 1. The database exists and is up-to-date
    // 2. The database exists but is out of date
    // 3. The database exists but the currentVersion setting does not or cannot be understood
    // 4. The database has not yet been created
    return versioning.getDatabaseVersion().then(function (databaseVersion) {
        var defaultVersion = versioning.getDefaultDatabaseVersion();

        // Update goes first, to allow for FORCE_MIGRATION
        // 2. The database exists but is out of date
        if (databaseVersion < defaultVersion || process.env.FORCE_MIGRATION) {
            // Migrate to latest version
            logger.info('Database upgrade required from version ' + databaseVersion + ' to ' +  defaultVersion);
            return update(databaseVersion, defaultVersion, logger);

            // 1. The database exists and is up-to-date
        } else if (databaseVersion === defaultVersion) {
            logger.info('Up-to-date at version ' + databaseVersion);
            // TODO: temporary fix for missing client.secret
            return fixClientSecret();

            // 3. The database exists but the currentVersion setting does not or cannot be understood
        } else {
            // In this case we don't understand the version because it is too high
            errors.logErrorAndExit(
                'Your database is not compatible with this version of Ghost',
                'You will need to create a new database'
            );
        }
    }, function (err) {
        if (err && err.message === 'Settings table does not exist') {
            // 4. The database has not yet been created
            // Bring everything up from initial version.
            logger.info('Database initialisation required for version ' + versioning.getDefaultDatabaseVersion());
            return populate(logger, tablesOnly);
        }
        // 3. The database exists but the currentVersion setting does not or cannot be understood
        // In this case the setting was missing or there was some other problem
        errors.logErrorAndExit('There is a problem with the database', err.message);
    });
};

module.exports = {
    init: init,
    reset: reset,
    backupDatabase: backup
};
