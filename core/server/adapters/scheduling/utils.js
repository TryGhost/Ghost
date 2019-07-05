const _ = require('lodash'),
    Promise = require('bluebird'),
    SchedulingBase = require('./SchedulingBase'),
    common = require('../../lib/common'),
    cache = {};

/**
 * @description Create the scheduling adapter.
 *
 * This utility helps us to:
 *
 *   - validate the scheduling config
 *   - cache the target adapter to ensure singletons
 *   - ensure the adapter can be instantiated
 *   - have a centralised error handling
 *   - detect if the adapter is inherited from the base adapter
 *   - detect if the adapter has implemented the required functions
 *
 * @param {Object} options
 * @return {Promise}
 */
exports.createAdapter = function (options) {
    options = options || {};

    let adapter = null;
    const {active: activeAdapter, internalPath, contentPath} = options;

    if (!activeAdapter) {
        return Promise.reject(new common.errors.IncorrectUsageError({
            message: 'Please provide an active adapter.'
        }));
    }

    if (Object.prototype.hasOwnProperty.call(cache, activeAdapter)) {
        return cache[activeAdapter];
    }

    /**
     * CASE: active adapter is a npm module
     */
    try {
        adapter = new (require(activeAdapter))(options);
    } catch (err) {
        if (err.code !== 'MODULE_NOT_FOUND') {
            return Promise.reject(new common.errors.IncorrectUsageError({err}));
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
            return Promise.reject(new common.errors.IncorrectUsageError({err}));
            // CASE: if module not found it can be an error within the adapter (cannot find bluebird for example)
        } else if (err.code === 'MODULE_NOT_FOUND' && err.message.indexOf(contentPath + activeAdapter) === -1) {
            return Promise.reject(new common.errors.IncorrectUsageError({
                err,
                help: `Please check the imports are valid in ${contentPath}${activeAdapter}`
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
                message: `We cannot find your adapter in: ${contentPath} or: ${internalPath}`
            }));
        }

        return Promise.reject(new common.errors.IncorrectUsageError({err}));
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
