const debug = require('ghost-ignition').debug('api:shared');
const Promise = require('bluebird');
const common = require('../../../lib/common');
const sequence = require('../../../lib/promise/sequence');

module.exports.input = (apiConfig, apiValidators, options) => {
    const ops = [];
    const sharedValidators = require('./input');

    if (!apiValidators) {
        return Promise.reject(new common.errors.IncorrectUsageError());
    }

    if (!apiConfig) {
        return Promise.reject(new common.errors.IncorrectUsageError());
    }

    // ##### SHARED OPTIONS VALIDATION
    if (sharedValidators.options) {
        if (sharedValidators.options.all) {
            ops.push(function validateOptionsShared() {
                return sharedValidators.options.all(apiConfig, options);
            });
        }
    }

    // ##### API VERSION OPTIONS VALIDATION
    if (apiValidators.options) {
        if (apiValidators.options.all) {
            ops.push(function validateOptionsApi() {
                return apiValidators.options.all(apiConfig, options);
            });
        }
    }

    // ##### SHARED RESOURCE VALIDATION
    // ...

    // ##### API VERSION RESOURCE VALIDATION
    if (apiValidators.all) {
        if (apiValidators.all[apiConfig.method]) {
            ops.push(function validateResourceAllShared() {
                return apiValidators.all[apiConfig.method](apiConfig, options);
            });
        }
    }

    if (apiValidators[apiConfig.docName]) {
        if (apiValidators[apiConfig.docName].all) {
            ops.push(function validateResourceAllDocName() {
                return apiValidators[apiConfig.docName].all(apiConfig, options);
            });
        }

        if (apiValidators[apiConfig.docName][apiConfig.method]) {
            ops.push(function validateResourceMethodDocName() {
                return apiValidators[apiConfig.docName][apiConfig.method](apiConfig, options);
            });
        }
    }

    debug(ops);

    return sequence(ops);
};
