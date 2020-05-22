const debug = require('ghost-ignition').debug('api:shared:serializers:handle');
const Promise = require('bluebird');
const sequence = require('../../../lib/promise/sequence');
const errors = require('@tryghost/errors');

/**
 * @description Shared input serialization handler.
 *
 * The shared input handler runs the request through all the validation steps.
 *
 * 1. Shared serialization
 * 2. API serialization
 *
 * @param {Object} apiConfig - Docname + method of the ctrl
 * @param {Object} apiSerializers - Target API serializers
 * @param {Object} frame
 */
module.exports.input = (apiConfig, apiSerializers, frame) => {
    debug('input');

    const tasks = [];
    const sharedSerializers = require('./input');

    if (!apiSerializers) {
        return Promise.reject(new errors.IncorrectUsageError());
    }

    if (!apiConfig) {
        return Promise.reject(new errors.IncorrectUsageError());
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

/**
 * @description Shared output serialization handler.
 *
 * The shared output handler runs the request through all the validation steps.
 *
 * 1. Shared serialization
 * 2. API serialization
 *
 * @param {Object} response - API response
 * @param {Object} apiConfig - Docname + method of the ctrl
 * @param {Object} apiSerializers - Target API serializers
 * @param {Object} frame
 */
module.exports.output = (response = {}, apiConfig, apiSerializers, frame) => {
    debug('output');

    const tasks = [];

    if (!apiConfig) {
        return Promise.reject(new errors.IncorrectUsageError());
    }

    if (!apiSerializers) {
        return Promise.reject(new errors.IncorrectUsageError());
    }

    // ##### API VERSION RESOURCE SERIALIZATION

    if (apiSerializers.all && apiSerializers.all.before) {
        tasks.push(function allSerializeBefore() {
            return apiSerializers.all.before(response, apiConfig, frame);
        });
    }

    if (apiSerializers[apiConfig.docName]) {
        if (apiSerializers[apiConfig.docName].all) {
            tasks.push(function serializeOptionsShared() {
                return apiSerializers[apiConfig.docName].all(response, apiConfig, frame);
            });
        }

        if (apiSerializers[apiConfig.docName][apiConfig.method]) {
            tasks.push(function serializeOptionsShared() {
                return apiSerializers[apiConfig.docName][apiConfig.method](response, apiConfig, frame);
            });
        }
    }

    if (apiSerializers.all && apiSerializers.all.after) {
        tasks.push(function allSerializeAfter() {
            return apiSerializers.all.after(apiConfig, frame);
        });
    }

    debug(tasks);
    return sequence(tasks);
};
