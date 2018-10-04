const Promise = require('bluebird');
const sequence = require('../../../lib/promise/sequence');
const common = require('../../../lib/common');

module.exports.input = (apiConfig, apiSerializers, frame) => {
    const ops = [];
    const sharedSerializers = require('./input');

    if (!apiSerializers) {
        return Promise.reject(new common.errors.IncorrectUsageError());
    }

    if (!apiConfig) {
        return Promise.reject(new common.errors.IncorrectUsageError());
    }

    // ##### SHARED ALL SERIALIZATION

    ops.push(function serializeAllShared() {
        return sharedSerializers.all(apiConfig, frame);
    });

    // ##### API VERSION RESOURCE SERIALIZATION

    if (apiSerializers.all) {
        ops.push(function serializeOptionsShared() {
            return apiSerializers.all(apiConfig, frame);
        });
    }

    if (apiSerializers[apiConfig.docName]) {
        if (apiSerializers[apiConfig.docName].all) {
            ops.push(function serializeOptionsShared() {
                return apiSerializers[apiConfig.docName].all(apiConfig, frame);
            });
        }

        if (apiSerializers[apiConfig.docName][apiConfig.method]) {
            ops.push(function serializeOptionsShared() {
                return apiSerializers[apiConfig.docName][apiConfig.method](apiConfig, frame);
            });
        }
    }

    return sequence(ops);
};

module.exports.output = (response = {}, apiConfig, apiSerializers, options) => {
    const ops = [];

    if (!apiConfig) {
        return Promise.reject(new common.errors.IncorrectUsageError());
    }

    if (!apiSerializers) {
        return Promise.reject(new common.errors.IncorrectUsageError());
    }

    // ##### API VERSION RESOURCE SERIALIZATION

    if (apiSerializers[apiConfig.docName]) {
        if (apiSerializers[apiConfig.docName].all) {
            ops.push(function serializeOptionsShared() {
                return apiSerializers[apiConfig.docName].all(response, apiConfig, options);
            });
        }

        if (apiSerializers[apiConfig.docName][apiConfig.method]) {
            ops.push(function serializeOptionsShared() {
                return apiSerializers[apiConfig.docName][apiConfig.method](response, apiConfig, options);
            });
        }
    }

    return sequence(ops);
};
