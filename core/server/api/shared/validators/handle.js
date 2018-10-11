const debug = require('ghost-ignition').debug('api:shared:validators:handle');
const Promise = require('bluebird');
const common = require('../../../lib/common');
const sequence = require('../../../lib/promise/sequence');

/**
 * The shared validation handler runs the request through all the validation steps.
 *
 * 1. shared validation
 * 2. api validation
 */
module.exports.input = (apiConfig, apiValidators, frame) => {
    debug('input');

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

    debug(tasks);
    return sequence(tasks);
};
