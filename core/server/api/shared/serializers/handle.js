const debug = require('ghost-ignition').debug('api:shared:serializers:handle');
const Promise = require('bluebird');
const sequence = require('../../../lib/promise/sequence');
const common = require('../../../lib/common');

/**
 * The shared serialization handler runs the request through all the serialization steps.
 *
 * 1. shared serialization
 * 2. api serialization
 */
module.exports.input = (apiConfig, apiSerializers, frame) => {
    debug('input');

    const tasks = [];
    const sharedSerializers = require('./input');

    if (!apiSerializers) {
        return Promise.reject(new common.errors.IncorrectUsageError());
    }

    if (!apiConfig) {
        return Promise.reject(new common.errors.IncorrectUsageError());
    }

    // ##### SHARED ALL SERIALIZATION

    tasks.push(function serializeAllShared() {
        return sharedSerializers.all.all(apiConfig, frame);
    });

    if (sharedSerializers.all[apiConfig.method]) {
        tasks.push(function serializeAllShared() {
            return sharedSerializers.all[apiConfig.method](apiConfig, frame);
        });
    }

    // ##### API VERSION RESOURCE SERIALIZATION

    if (apiSerializers.all) {
        tasks.push(function serializeOptionsShared() {
            return apiSerializers.all(apiConfig, frame);
        });
    }

    if (apiSerializers[apiConfig.docName]) {
        if (apiSerializers[apiConfig.docName].all) {
            tasks.push(function serializeOptionsShared() {
                return apiSerializers[apiConfig.docName].all(apiConfig, frame);
            });
        }

        if (apiSerializers[apiConfig.docName][apiConfig.method]) {
            tasks.push(function serializeOptionsShared() {
                return apiSerializers[apiConfig.docName][apiConfig.method](apiConfig, frame);
            });
        }
    }

    debug(tasks);
    return sequence(tasks);
};

module.exports.output = (response = {}, apiConfig, apiSerializers, options) => {
    debug('output');

    const tasks = [];

    if (!apiConfig) {
        return Promise.reject(new common.errors.IncorrectUsageError());
    }

    if (!apiSerializers) {
        return Promise.reject(new common.errors.IncorrectUsageError());
    }

    // ##### API VERSION RESOURCE SERIALIZATION

    if (apiSerializers.all && apiSerializers.all.before) {
        tasks.push(function allSerializeBefore() {
            return apiSerializers.all.before(response, apiConfig, options);
        });
    }

    if (apiSerializers[apiConfig.docName]) {
        if (apiSerializers[apiConfig.docName].all) {
            tasks.push(function serializeOptionsShared() {
                return apiSerializers[apiConfig.docName].all(response, apiConfig, options);
            });
        }

        if (apiSerializers[apiConfig.docName][apiConfig.method]) {
            tasks.push(function serializeOptionsShared() {
                return apiSerializers[apiConfig.docName][apiConfig.method](response, apiConfig, options);
            });
        }
    }

    if (apiSerializers.all && apiSerializers.all.after) {
        tasks.push(function allSerializeAfter() {
            return apiSerializers.all.after(apiConfig, options);
        });
    }

    debug(tasks);
    return sequence(tasks);
};
