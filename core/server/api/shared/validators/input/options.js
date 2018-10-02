const _ = require('lodash');
const INTERNAL_OPTIONS = ['transacting', 'forUpdate'];

module.exports = {
    all(apiConfig, options) {
        if (!options.apiOptions.context.internal) {
            options.apiOptions = _.omit(options.apiOptions, INTERNAL_OPTIONS);
        }

        if (apiConfig.queryOptions) {
            if (typeof apiConfig.queryOptions === 'function') {
                apiConfig.queryOptions = apiConfig.queryOptions(options);
            }

            Object.assign(options.apiOptions, _.pick(options.params, apiConfig.queryOptions));
            Object.assign(options.apiOptions, _.pick(options.query, apiConfig.queryOptions));
        }

        options.queryData = {};

        if (apiConfig.queryData) {
            if (typeof apiConfig.queryData === 'function') {
                apiConfig.queryData = apiConfig.queryData(options);
            }

            Object.assign(options.queryData, _.pick(options.query, apiConfig.queryData));
            Object.assign(options.queryData, _.pick(options.params, apiConfig.queryData));
        }
    }
};
