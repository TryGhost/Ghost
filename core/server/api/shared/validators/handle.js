const debug = require('ghost-ignition').debug('api:shared:validators:handle');
const Promise = require('bluebird');
const common = require('../../../lib/common');
const sequence = require('../../../lib/promise/sequence');

/**
 * @description Shared input validation handler.
 *
 * The shared validation handler runs the request through all the validation steps.
 *
 * 1. Shared validation
 * 2. API validation
 *
 * @param {Object} apiConfig - Docname + method of the ctrl
 * @param {Object} apiValidators - Target API validators
 * @param {Object} frame
 */
module.exports.input = (apiConfig, apiValidators, frame) => {
    debug('input begin');

    const tasks = [];
    const sharedValidators = require('./input');

    if (!apiValidators) {
        return Promise.reject(new common.errors.IncorrectUsageError());
    }

    if (!apiConfig) {
        return Promise.reject(new common.errors.IncorrectUsageError());
    }

    // ##### SHARED ALL VALIDATION

    tasks.push(function allShared() {
        return sharedValidators.all.all(apiConfig, frame);
    });

    if (sharedValidators.all[apiConfig.method]) {
        tasks.push(function allShared() {
            return sharedValidators.all[apiConfig.method](apiConfig, frame);
        });
    }

    // ##### API VERSION VALIDATION

    if (apiValidators.all) {
        tasks.push(function allAPIVersion() {
            return apiValidators.all[apiConfig.method](apiConfig, frame);
        });
    }

    if (apiValidators[apiConfig.docName]) {
        if (apiValidators[apiConfig.docName].all) {
            tasks.push(function docNameAll() {
                return apiValidators[apiConfig.docName].all(apiConfig, frame);
            });
        }

        if (apiValidators[apiConfig.docName][apiConfig.method]) {
            tasks.push(function docNameMethod() {
                return apiValidators[apiConfig.docName][apiConfig.method](apiConfig, frame);
            });
        }
    }

    debug('input ready');
    return sequence(tasks);
};
