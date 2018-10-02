const Promise = require('bluebird');
const _ = require('lodash');
const validation = require('../../../../../data/validation');
const common = require('../../../../../lib/common');

const GLOBAL_VALIDATORS = {
    id: {matches: /^[a-f\d]{24}$|^1$|me/i},
    page: {matches: /^\d+$/},
    limit: {matches: /^\d+|all$/},
    from: {isDate: true},
    to: {isDate: true},
    columns: {matches: /^[\w, ]+$/},
    order: {matches: /^[a-z0-9_,. ]+$/i},
    uuid: {isUUID: true},
    slug: {isSlug: true},
    name: {},
    email: {isEmail: true},
    filter: false,
    context: false,
    forUpdate: false,
    transacting: false,
    include: false,
    formats: false
};

const validate = (config, attrs) => {
    let errors = [];

    _.each(attrs, (value, key) => {
        if (GLOBAL_VALIDATORS[key]) {
            if (config.queryOptionsValues && config.queryOptionsValues[key]) {
                if (!value || value.length === 1) {
                    return;
                }

                if (value.trim().toLowerCase().split(',').difference(config.queryOptionsValues[key]).length) {
                    errors.push(new common.errors.ValidationError());
                }
            } else {
                errors = errors.concat(validation.validate(value, key, GLOBAL_VALIDATORS[key]));
            }
        }
    });

    return errors;
};

module.exports = {
    all(apiConfig, options) {
        let validationErrors;

        if (options.apiOptions) {
            validationErrors = validate(apiConfig, options.apiOptions);
        }

        if (!_.isEmpty(validationErrors)) {
            return Promise.reject(validationErrors[0]);
        }

        if (options.queryData) {
            validationErrors = validate(apiConfig, options.queryData);
        }

        if (!_.isEmpty(validationErrors)) {
            return Promise.reject(validationErrors[0]);
        }

        return Promise.resolve();
    }
};
