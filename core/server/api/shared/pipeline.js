const debug = require('ghost-ignition').debug('api:shared:pipeline');
const Promise = require('bluebird');
const _ = require('lodash');
const shared = require('../shared');
const common = require('../../lib/common');
const sequence = require('../../lib/promise/sequence');

const STAGES = {
    validation: {
        input(apiUtils, apiConfig, apiImpl, frame) {
            debug('stages: validation');
            const tasks = [];

            // CASE: do validation completely yourself
            if (typeof apiImpl.validation === 'function') {
                debug('validation function call');
                return apiImpl.validation(frame);
            }

            tasks.push(function doValidation() {
                return shared.validators.handle.input(
                    Object.assign({}, apiConfig, apiImpl.validation),
                    apiUtils.validators.input,
                    frame
                );
            });

            return sequence(tasks);
        }
    },

    serialisation: {
        input(apiUtils, apiConfig, apiImpl, frame) {
            debug('stages: input serialisation');
            return shared.serializers.handle.input(
                Object.assign({data: apiImpl.data}, apiConfig),
                apiUtils.serializers.input,
                frame
            );
        },
        output(response, apiUtils, apiConfig, apiImpl, frame) {
            debug('stages: output serialisation');
            return shared.serializers.handle.output(response, apiConfig, apiUtils.serializers.output, frame);
        }
    },

    permissions(apiUtils, apiConfig, apiImpl, frame) {
        debug('stages: permissions');
        const tasks = [];

        // CASE: it's required to put the permission key to avoid security holes
        if (!apiImpl.hasOwnProperty('permissions')) {
            return Promise.reject(new common.errors.IncorrectUsageError());
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

    query(apiUtils, apiConfig, apiImpl, frame) {
        debug('stages: query');

        if (!apiImpl.query) {
            return Promise.reject(new common.errors.IncorrectUsageError());
        }

        return apiImpl.query(frame);
    }
};

const pipeline = (apiController, apiUtils, apiType) => {
    const keys = Object.keys(apiController);

    // CASE: api controllers are objects with configuration.
    //       We have to ensure that we expose a functional interface e.g. `api.posts.add` has to be available.
    return keys.reduce((obj, key) => {
        const docName = apiController.docName;
        const method = key;

        const apiImpl = _.cloneDeep(apiController)[key];

        obj[key] = function wrapper() {
            const apiConfig = {docName, method};
            let options, data, frame;

            if (arguments.length === 2) {
                data = arguments[0];
                options = arguments[1];
            } else if (arguments.length === 1) {
                options = arguments[0] || {};
            } else {
                options = {};
            }

            // CASE: http helper already creates it's own frame.
            if (!(options instanceof shared.Frame)) {
                frame = new shared.Frame({
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

            return Promise.resolve()
                .then(() => {
                    return STAGES.validation.input(apiUtils, apiConfig, apiImpl, frame);
                })
                .then(() => {
                    return STAGES.serialisation.input(apiUtils, apiConfig, apiImpl, frame);
                })
                .then(() => {
                    return STAGES.permissions(apiUtils, apiConfig, apiImpl, frame);
                })
                .then(() => {
                    return STAGES.query(apiUtils, apiConfig, apiImpl, frame);
                })
                .then((response) => {
                    return STAGES.serialisation.output(response, apiUtils, apiConfig, apiImpl, frame);
                })
                .then(() => {
                    return frame.response;
                });
        };

        Object.assign(obj[key], apiImpl);
        return obj;
    }, {});
};

module.exports = pipeline;
module.exports.STAGES = STAGES;
