var _ = require('lodash'),
    Promise = require('bluebird'),
    SchedulingBase = require(__dirname + '/SchedulingBase'),
    errors = require(__dirname + '/../errors');

exports.createAdapter = function (options) {
    options = options || {};

    var adapter = null,
        activeAdapter = options.active,
        path = options.path;

    if (!activeAdapter) {
        return Promise.reject(new errors.IncorrectUsage('Please provide an active adapter.'));
    }

    /**
     * CASE: active adapter is a npm module
     */
    try {
        adapter = new (require(activeAdapter))(options);
    } catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND') {
            return Promise.reject(new errors.IncorrectUsage(err.message));
        }
    }

    /**
     * CASE: active adapter is located in specific ghost path
     */
    try {
        adapter = adapter || new (require(path + activeAdapter))(options);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            return Promise.reject(new errors.IncorrectUsage('MODULE_NOT_FOUND', activeAdapter));
        }

        return Promise.reject(new errors.IncorrectUsage(err.message));
    }

    if (!(adapter instanceof SchedulingBase)) {
        return Promise.reject(new errors.IncorrectUsage('Your adapter does not inherit from the SchedulingBase.'));
    }

    if (!adapter.requiredFns) {
        return Promise.reject(new errors.IncorrectUsage('Your adapter does not provide the minimum required functions.'));
    }

    if (_.xor(adapter.requiredFns, Object.keys(_.pick(Object.getPrototypeOf(adapter), adapter.requiredFns))).length) {
        return Promise.reject(new errors.IncorrectUsage('Your adapter does not provide the minimum required functions.'));
    }

    return Promise.resolve(adapter);
};
