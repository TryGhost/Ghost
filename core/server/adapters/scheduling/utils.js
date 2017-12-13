var _ = require('lodash'),
    Promise = require('bluebird'),
    SchedulingBase = require('./SchedulingBase'),
    common = require('../../lib/common'),
    cache = {};

exports.createAdapter = function (options) {
    options = options || {};

    var adapter = null,
        activeAdapter = options.active,
        internalPath = options.internalPath,
        contentPath = options.contentPath;

    if (!activeAdapter) {
        return Promise.reject(new common.errors.IncorrectUsageError({
            message: 'Please provide an active adapter.'
        }));
    }

    if (cache.hasOwnProperty(activeAdapter)) {
        return cache[activeAdapter];
    }

    /**
     * CASE: active adapter is a npm module
     */
    try {
        adapter = new (require(activeAdapter))(options);
    } catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND') {
            return Promise.reject(new common.errors.IncorrectUsageError({err: err}));
        }
    }

    /**
     * CASE: active adapter is located in specific ghost path
     */
    try {
        adapter = adapter || new (require(contentPath + activeAdapter))(options);
    } catch (err) {
        // CASE: only throw error if module does exist
        if (err.code !== 'MODULE_NOT_FOUND') {
            return Promise.reject(new common.errors.IncorrectUsageError({err: err}));
            // CASE: if module not found it can be an error within the adapter (cannot find bluebird for example)
        } else if (err.code === 'MODULE_NOT_FOUND' && err.message.indexOf(contentPath + activeAdapter) === -1) {
            return Promise.reject(new common.errors.IncorrectUsageError({
                err: err,
                help: 'Please check the imports are valid in ' + contentPath + activeAdapter
            }));
        }
    }

    /**
     * CASE: active adapter is located in internal ghost path
     */
    try {
        adapter = adapter || new (require(internalPath + activeAdapter))(options);
    } catch (err) {
        // CASE: only throw error if module does exist
        if (err.code === 'MODULE_NOT_FOUND') {
            return Promise.reject(new common.errors.IncorrectUsageError({
                message: 'We cannot find your adapter in: ' + contentPath + ' or: ' + internalPath
            }));
        }

        return Promise.reject(new common.errors.IncorrectUsageError({err: err}));
    }

    if (!(adapter instanceof SchedulingBase)) {
        return Promise.reject(new common.errors.IncorrectUsageError({
            message: 'Your adapter does not inherit from the SchedulingBase.'
        }));
    }

    if (!adapter.requiredFns) {
        return Promise.reject(new common.errors.IncorrectUsageError({
            message: 'Your adapter does not provide the minimum required functions.'
        }));
    }

    if (_.xor(adapter.requiredFns, Object.keys(_.pick(Object.getPrototypeOf(adapter), adapter.requiredFns))).length) {
        return Promise.reject(new common.errors.IncorrectUsageError({
            message: 'Your adapter does not provide the minimum required functions.'
        }));
    }

    cache[activeAdapter] = adapter;

    return Promise.resolve(adapter);
};
