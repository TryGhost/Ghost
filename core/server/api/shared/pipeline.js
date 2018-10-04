const debug = require('ghost-ignition').debug('api:shared');
const Promise = require('bluebird');
const _ = require('lodash');
const shared = require('../shared');
const common = require('../../lib/common');
const sequence = require('../../lib/promise/sequence');

const STAGES = {
    validation: {
        input(apiUtils, apiConfig, apiImpl, options) {
            debug('stages: validation');
            const ops = [];

            // CASE: do validation completely yourself
            if (typeof apiImpl.validation === 'function') {
                return apiImpl.validation(options);
            }

            ops.push(function doValidation() {
                return shared.validators.handle.input(
                    Object.assign({}, apiConfig, apiImpl.validation),
                    apiUtils.validators.input,
                    options
                );
            });

            return sequence(ops);
        }
    },

    serialisation: {
        input(apiUtils, apiConfig, apiImpl, options) {
            debug('stages: input serialisation');
            return shared.serializers.handle.input(apiConfig, apiUtils.serializers.input, options);
        },
        output(response, apiUtils, apiConfig, apiImpl, options) {
            debug('stages: output serialisation');
            return shared.serializers.handle.output(response, apiConfig, apiUtils.serializers.output, options);
        }
    },

    permissions(apiUtils, apiConfig, apiImpl, options) {
        debug('stages: permissions');
        const ops = [];

        // CASE: it's required to put the permission key to avoid security holes
        if (!apiImpl.hasOwnProperty('permissions')) {
            return Promise.reject(new common.errors.IncorrectUsageError());
        }

        // CASE: handle permissions completely yourself
        if (typeof apiImpl.permissions === 'function') {
            return apiImpl.permissions(options);
        }

        // CASE: skip stage completely
        if (typeof apiImpl.permissions === 'boolean' && apiImpl.permissions === false) {
            return Promise.resolve();
        }

        ops.push(function doPermissions() {
            return apiUtils.permissions.handle(
                Object.assign({}, apiConfig, apiImpl.permissions),
                options
            );
        });

        return sequence(ops);
    },

    query(apiUtils, apiConfig, apiImpl, options) {
        debug('stages: query');
        if (!apiImpl.query) {
            return Promise.reject(new common.errors.IncorrectUsageError());
        }

        return apiImpl.query(options);
    }
};

const pipeline = (apiController, apiUtils) => {
    const keys = Object.keys(apiController);

    return keys.reduce((obj, key) => {
        const docName = apiController.docName;
        const method = key;

        const apiImpl = _.cloneDeep(apiController)[key];

        obj[key] = function wrapper() {
            const apiConfig = {docName, method};
            let options, data;

            if (arguments.length === 2) {
                data = arguments[0];
                options = arguments[1];
            } else if (arguments.length === 1) {
                options = arguments[0] || {};
            } else {
                options = {};
            }

            if (!(options instanceof shared.Frame)) {
                frame = new shared.Frame({
                    body: data,
                    options: options,
                    context: {}
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
                return apiImpl(options);
            }

            return Promise.resolve()
                .then(() => {
                    return STAGES.validation.input(apiUtils, apiConfig, apiImpl, options);
                })
                .then(() => {
                    return STAGES.serialisation.input(apiUtils, apiConfig, apiImpl, options);
                })
                .then(() => {
                    return STAGES.permissions(apiUtils, apiConfig, apiImpl, options);
                })
                .then(() => {
                    return STAGES.query(apiUtils, apiConfig, apiImpl, options);
                })
                .then((response) => {
                    return STAGES.serialisation.output(response, apiUtils, apiConfig, apiImpl, options);
                })
                .then(() => {
                    return options.response;
                });
        };

        Object.assign(obj[key], apiImpl);
        return obj;
    }, {});
};

module.exports = pipeline;
module.exports.STAGES = STAGES;
