const debug = require('@tryghost/debug')('api:shared:serializers:handle');
const Promise = require('bluebird');
const {sequence} = require('@tryghost/promise');
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

    if (!apiConfig) {
        return Promise.reject(new errors.IncorrectUsageError());
    }

    if (!apiSerializers) {
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

const getBestMatchSerializer = function (apiSerializers, docName, method) {
    if (apiSerializers[docName] && apiSerializers[docName][method]) {
        debug(`Calling ${docName}.${method}`);
        return apiSerializers[docName][method].bind(apiSerializers[docName]);
    } else if (apiSerializers[docName] && apiSerializers[docName].all) {
        debug(`Calling ${docName}.all`);
        return apiSerializers[docName].all.bind(apiSerializers[docName]);
    }

    debug(`Returning as-is`);
    return false;
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

    const customSerializer = getBestMatchSerializer(apiSerializers, apiConfig.docName, apiConfig.method);
    const defaultSerializer = getBestMatchSerializer(apiSerializers, 'default', apiConfig.method);

    if (customSerializer) {
        // CASE: custom serializer exists
        tasks.push(function doCustomSerializer() {
            return customSerializer(response, apiConfig, frame);
        });
    } else if (defaultSerializer) {
        // CASE: Fall back to default serializer
        tasks.push(function doDefaultSerializer() {
            return defaultSerializer(response, apiConfig, frame);
        });
    }

    if (apiSerializers.all && apiSerializers.all.after) {
        tasks.push(function allSerializeAfter() {
            return apiSerializers.all.after(apiConfig, frame);
        });
    }

    debug(tasks);
    return sequence(tasks);
};
