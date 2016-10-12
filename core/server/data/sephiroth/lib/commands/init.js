var Promise = require('bluebird'),
    utils = require('../utils'),
    errors = require('../errors'),
    logging = require('../../../../logging');

/**
 * @TODO:
 * - better error handling
 * - prettier code please
 * - dirty requires
 *
 * sephiroth init --only 1 (execute first script only)
 * sephiroth init --skip 2 (execute all except of 2)
 * sephiroth migrate --version 1.0 --only 1
 */
module.exports = function init(options) {
    options = options || {};

    var initPath = utils.getPath({type: 'init'}),
        dbInitTasks = utils.readTasks(initPath),
        skip = options.skip || null,
        only = options.only || null;

    if (only !== null) {
        dbInitTasks = [dbInitTasks[only - 1]];
    } else if (skip !== null) {
        dbInitTasks.splice(skip - 1, 1);
    }

    return utils.createTransaction(function executeTasks(transacting) {
        return Promise.each(dbInitTasks, function executeInitTask(task) {
            return utils.preTask({
                transacting: transacting,
                task: task.name,
                type: 'init'
            }).then(function () {
                logging.info('Running: ' + task.name);

                return task.execute({
                    transacting: transacting
                });
            }).then(function () {
                return utils.postTask({
                    transacting: transacting,
                    task: task.name,
                    type: 'init'
                });
            }).catch(function (err) {
                if (err instanceof errors.MigrationExistsError) {
                    logging.warn('Skipping:' + task.name);
                    return Promise.resolve();
                }

                throw err;
            });
        });
    }).catch(function (err) {
        logging.warn('rolling back...');
        return Promise.reject(err);
    });
};
