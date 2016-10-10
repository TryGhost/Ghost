var path = require('path'),
    _ = require('lodash'),
    fs = require('fs'),
    database = require('./database'),
    logging = require('../../../logging');

exports.errors = {
    taskFound: 100,
    unknown: 99,
    migrationsTableMissing: 98,
    dbInitMissing: 97,
    databaseConfigMissing: 96
};

/**
 * Sephiroth erorr handling for now
 */
exports.throwError = function throwError(options) {
    var code = options.code,
        err = new Error();

    err.code = code;
    throw err;
};

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
        throw err;
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
                exports.throwError({code: exports.errors.taskFound});
            }
        })
        .catch(function (err) {
            // CASE: table does not exist
            if (err.errno === 1) {
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

            exports.throwError({code: exports.errors.dbInitMissing});
        })
        .catch(function (err) {
            // CASE: table does not exist
            if (err.errno === 1) {
                exports.throwError({code: exports.errors.dbInitMissing});
            }

            exports.throwError({code: exports.errors.unknown});
        });
};
