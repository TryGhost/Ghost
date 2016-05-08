var lodash = require('lodash'),
    Promise = require('bluebird'),
    SchedulingBase = require(__dirname + '/SchedulingBase'),
    errors = require(__dirname + '/../errors');

exports.createAdapter = function (options) {
    options = options || {};

    var adapter = null,
        scheduler = options.active,
        path = options.path;

    if (!scheduler) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    /**
     * CASE: scheduler is npm module
     */
    try {
        adapter = new (require(scheduler))(options);
    } catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND') {
            return Promise.reject(new errors.IncorrectUsage(err.message));
        }
    }

    /**
     * CASE: scheduler is located in specific path
     */
    try {
        adapter = adapter || new (require(path + scheduler))(options);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            return Promise.reject(new errors.IncorrectUsage('MODULE_NOT_FOUND', scheduler));
        }

        return Promise.reject(new errors.IncorrectUsage(err.message));
    }

    if (!(adapter instanceof SchedulingBase)) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    if (!adapter.requiredFns) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    if (lodash.xor(adapter.requiredFns, Object.keys(lodash.pick(Object.getPrototypeOf(adapter), adapter.requiredFns))).length) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    return Promise.resolve(adapter);
};
