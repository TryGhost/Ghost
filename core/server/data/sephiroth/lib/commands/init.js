var Promise = require('bluebird'),
    path = require('path'),
    utils = require('../utils'),
    errors = require('../errors'),
    logging = require('../../../../logging');

/**
 * @TODO:
 * - better error handling
 * - prettier code please
 * - dirty requires
 */
module.exports = function init(options) {
    options = options || {};

    var initPath = utils.getPath({type: 'init'}),
        dbInitTasks = utils.readTasks(initPath);

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
