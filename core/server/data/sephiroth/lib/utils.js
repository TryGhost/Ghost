var path = require('path'),
    _ = require('lodash'),
    fs = require('fs'),
    database = require('./database'),
    errors = require('./errors'),
    logging = require('../../../logging');

exports.readTasks = function readTasks(absolutePath) {
    var files = [],
        tasks = [];

    try {
        files = fs.readdirSync(absolutePath);

        _.each(files, function (file) {
            tasks.push({
                execute: require(path.join(absolutePath, file)),
                name: file
            });
        });

        return tasks;
    } catch (err) {
        throw new errors.SephirothError({err: err});
    }
};

exports.createTransaction = function createTransaction(callback) {
    return database.knex.transaction(callback);
};

/**
 * each migration file get's saved into the database
 * @TODO: add version
 */
exports.preTask = function preTask(options) {
    options = options || {};

    var localDatabase = options.database,
        task = options.task,
        type = options.type;

    return (localDatabase || database.knex)('migrations')
        .then(function (migrations) {
            if (!migrations.length) {
                return;
            }

            if (_.find(migrations, {name: task, type: type})) {
                throw new errors.MigrationExistsError();
            }
        })
        .catch(function (err) {
            // CASE: table does not exist
            if (err.errno === 1 || err.errno === 1146) {
                logging.info('Creating table: migrations');

                return (localDatabase || database.knex).schema.createTable('migrations', function (table) {
                    table.string('name');
                    table.string('type');
                });
            }

            throw err;
        });
};

/**
 * write migration key
 */
exports.postTask = function postTask(options) {
    options = options || {};

    var localDatabase = options.database,
        task = options.task,
        type = options.type;

    return (localDatabase || database.knex)('migrations')
        .insert({
            name: task,
            type: type
        });
};

/**
 * - check init
 * - check seed
 *
 * @TODO: optimise!
 */
exports.isDatabaseOK = function isDatabaseOK(options) {
    options = options || {};

    var localDatabase = options.database;

    return (localDatabase || database.knex)('migrations')
        .then(function (migrations) {
            if (_.find(migrations, {type: 'init'})) {
                return;
            }

            throw new errors.DatabaseIsNotOkError({
                message: 'Please run node core/server/data/sephiroth/bin/sephiroth init.',
                code: 'DB_NOT_INITIALISED'
            });
        })
        .catch(function (err) {
            if (err.errno === 1 || err.errno === 1146) {
                throw new errors.DatabaseIsNotOkError({
                    message: 'Please run node core/server/data/sephiroth/bin/sephiroth init.',
                    code: 'MIGRATION_TABLE_IS_MISSING'
                });
            }

            throw new errors.SephirothError({
                err: err
            });
        });
};
