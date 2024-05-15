const debug = require('@tryghost/debug')('pipeline');
const _ = require('lodash');
const stringify = require('json-stable-stringify');
const errors = require('@tryghost/errors');
const {sequence} = require('@tryghost/promise');

const Frame = require('./Frame');
const serializers = require('./serializers');
const validators = require('./validators');

const STAGES = {
    validation: {
        /**
         * @description Input validation.
         *
         * We call the shared validator which runs the request through:
         *
         * 1. Shared validator
         * 2. Custom API validators
         *
         * @param {Object} apiUtils - Local utils of target API version.
         * @param {Object} apiConfig - Docname & Method of ctrl.
         * @param {import('@tryghost/api-framework').ControllerMethod} apiImpl -  Controller configuration.
         * @param {import('@tryghost/api-framework').Frame} frame
         * @return {Promise}
         */
        input(apiUtils, apiConfig, apiImpl, frame) {
            debug('stages: validation');
            const tasks = [];

            // CASE: do validation completely yourself
            if (typeof apiImpl.validation === 'function') {
                debug('validation function call');
                return apiImpl.validation(frame);
            }

            tasks.push(function doValidation() {
                return validators.handle.input(
                    Object.assign({}, apiConfig, apiImpl.validation),
                    apiUtils.validators.input,
                    frame
                );
            });

            return sequence(tasks);
        }
    },

    serialisation: {
        /**
         * @description Input Serialisation.
         *
         * We call the shared serializer which runs the request through:
         *
         * 1. Shared serializers
         * 2. Custom API serializers
         *
         * @param {Object} apiUtils - Local utils of target API version.
         * @param {Object} apiConfig - Docname & Method of ctrl.
         * @param {import('@tryghost/api-framework').ControllerMethod} apiImpl -  Controller configuration.
         * @param {import('@tryghost/api-framework').Frame} frame
         * @return {Promise}
         */
        input(apiUtils, apiConfig, apiImpl, frame) {
            debug('stages: input serialisation');
            return serializers.handle.input(
                Object.assign({data: apiImpl.data}, apiConfig),
                apiUtils.serializers.input,
                frame
            );
        },

        /**
         * @description Output Serialisation.
         *
         * We call the shared serializer which runs the request through:
         *
         * 1. Shared serializers
         * 2. Custom API serializers
         *
         * @param {Object} apiUtils - Local utils of target API version.
         * @param {Object} apiConfig - Docname & Method of ctrl.
         * @param {import('@tryghost/api-framework').ControllerMethod} apiImpl -  Controller configuration.
         * @param {import('@tryghost/api-framework').Frame} frame
         * @return {Promise}
         */
        output(response, apiUtils, apiConfig, apiImpl, frame) {
            debug('stages: output serialisation');
            return serializers.handle.output(response, apiConfig, apiUtils.serializers.output, frame);
        }
    },

    /**
     * @description Permissions stage.
     *
     * We call the target API implementation of permissions.
     * Permissions implementation can change across API versions.
     * There is no shared implementation right now.
     *
     * @param {Object} apiUtils - Local utils of target API version.
     * @param {Object} apiConfig - Docname & Method of ctrl.
     * @param {import('@tryghost/api-framework').ControllerMethod} apiImpl -  Controller configuration.
     * @param {import('@tryghost/api-framework').Frame} frame
     * @return {Promise}
     */
    permissions(apiUtils, apiConfig, apiImpl, frame) {
        debug('stages: permissions');
        const tasks = [];

        // CASE: it's required to put the permission key to avoid security holes
        if (!Object.prototype.hasOwnProperty.call(apiImpl, 'permissions')) {
            return Promise.reject(new errors.IncorrectUsageError());
        }

        // CASE: handle permissions completely yourself
        if (typeof apiImpl.permissions === 'function') {
            debug('permissions function call');
            return apiImpl.permissions(frame);
        }

        // CASE: skip stage completely
        if (apiImpl.permissions === false) {
            debug('disabled permissions');
            return Promise.resolve();
        }

        if (typeof apiImpl.permissions === 'object' && apiImpl.permissions.before) {
            tasks.push(function beforePermissions() {
                return apiImpl.permissions.before(frame);
            });
        }

        tasks.push(function doPermissions() {
            return apiUtils.permissions.handle(
                Object.assign({}, apiConfig, apiImpl.permissions),
                frame
            );
        });

        return sequence(tasks);
    },

    /**
     * @description Execute controller & receive model response.
     *
     * @param {Object} apiUtils - Local utils of target API version.
     * @param {Object} apiConfig - Docname & Method of ctrl.
     * @param {import('@tryghost/api-framework').ControllerMethod} apiImpl -  Controller configuration.
     * @param {import('@tryghost/api-framework').Frame} frame
     * @return {Promise}
     */
    query(apiUtils, apiConfig, apiImpl, frame) {
        debug('stages: query');

        if (!apiImpl.query) {
            return Promise.reject(new errors.IncorrectUsageError());
        }

        return apiImpl.query(frame);
    }
};

const controllerMap = new Map();

/**
 * @description The pipeline runs the request through all stages (validation, serialisation, permissions).
 *
 * The target API version calls the pipeline and wraps the actual ctrl implementation to be able to
 * run the request through various stages before hitting the controller.
 *
 * The stages are executed in the following order:
 *
 * 1. Input validation - General & schema validation
 * 2. Input serialisation - Modification of incoming data e.g. force filters, auto includes, url transformation etc.
 * 3. Permissions - Runs after validation & serialisation because the body structure must be valid (see unsafeAttrs)
 * 4. Controller - Execute the controller implementation & receive model response.
 * 5. Output Serialisation - Output formatting, Deprecations, Extra attributes etc...
 *
 * @param {import('@tryghost/api-framework').Controller} apiController
 * @param {Object} apiUtils - Local utils (validation & serialisation) from target API version
 * @param {String} [apiType] - Content or Admin API access
 * @return {Object}
 */
const pipeline = (apiController, apiUtils, apiType) => {
    if (controllerMap.has(apiController)) {
        return controllerMap.get(apiController);
    }

    const keys = Object.keys(apiController).filter(key => key !== 'docName');
    const docName = apiController.docName;

    // CASE: api controllers are objects with configuration.
    //       We have to ensure that we expose a functional interface e.g. `api.posts.add` has to be available.
    const result = keys.reduce((obj, method) => {
        const apiImpl = _.cloneDeep(apiController)[method];

        Object.freeze(apiImpl.headers);

        obj[method] = async function ImplWrapper() {
            const apiConfig = {docName, method};
            let options;
            let data;
            let frame;

            if (arguments.length === 2) {
                data = arguments[0];
                options = arguments[1];
            } else if (arguments.length === 1) {
                options = arguments[0] || {};
            } else {
                options = {};
            }

            // CASE: http helper already creates it's own frame.
            if (!(options instanceof Frame)) {
                debug(`Internal API request for ${docName}.${method}`);
                frame = new Frame({
                    body: data,
                    options: _.omit(options, 'context'),
                    context: options.context || {}
                });

                frame.configure({
                    options: apiImpl.options,
                    data: apiImpl.data
                });
            } else {
                frame = options;
            }

            // CASE: api controller *can* be a single function, but it's not recommended to disable the framework.
            if (typeof apiImpl === 'function') {
                debug('ctrl function call');
                return apiImpl(frame);
            }

            frame.apiType = apiType;
            frame.docName = docName;
            frame.method = method;

            let cacheKeyData = frame.options;
            if (apiImpl.generateCacheKeyData) {
                cacheKeyData = await apiImpl.generateCacheKeyData(frame);
            }

            const cacheKey = stringify(cacheKeyData);

            if (apiImpl.cache) {
                const response = await apiImpl.cache.get(cacheKey, getResponse);
                if (response) {
                    return Promise.resolve(response);
                }
            }

            async function getResponse() {
                await STAGES.validation.input(apiUtils, apiConfig, apiImpl, frame);
                await STAGES.serialisation.input(apiUtils, apiConfig, apiImpl, frame);
                await STAGES.permissions(apiUtils, apiConfig, apiImpl, frame);
                const response = await STAGES.query(apiUtils, apiConfig, apiImpl, frame);
                await STAGES.serialisation.output(response, apiUtils, apiConfig, apiImpl, frame);
                return frame.response;
            }

            const response = await getResponse();

            if (apiImpl.cache) {
                await apiImpl.cache.set(cacheKey, response);
            }

            return response;
        };

        Object.assign(obj[method], apiImpl);
        return obj;
    }, {});

    controllerMap.set(apiController, result);

    return result;
};

module.exports = pipeline;
module.exports.STAGES = STAGES;
