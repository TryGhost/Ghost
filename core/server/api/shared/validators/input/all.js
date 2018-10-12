const debug = require('ghost-ignition').debug('api:shared:validators:input:all');
const _ = require('lodash');
const Promise = require('bluebird');
const common = require('../../../../lib/common');
const validation = require('../../../../data/validation');

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

    _.each(config, (value, key) => {
        if (value.required && !attrs[key]) {
            errors.push(new common.errors.ValidationError({
                message: `${key} is required.`
            }));
        }
    });

    _.each(attrs, (value, key) => {
        debug(key, value);

        if (config && config[key]) {
            const allowedValues = Array.isArray(config[key]) ? config[key] : config[key].values;

            if (allowedValues) {
                debug('ctrl validation');

                const valuesAsArray = value.trim().toLowerCase().split(',');
                const unallowedValues = _.filter(valuesAsArray, (value) => {
                    return !allowedValues.includes(value);
                });

                if (unallowedValues.length) {
                    errors.push(new common.errors.ValidationError({
                        message: common.i18n.t('notices.data.validation.index.validationFailed', {
                            validationName: 'AllowedValues',
                            key: key
                        })
                    }));
                }
            }
        } else if (GLOBAL_VALIDATORS[key]) {
            debug('global validation');
            errors = errors.concat(validation.validate(value, key, GLOBAL_VALIDATORS[key]));
        }
    });

    return errors;
};

module.exports = function validateAll(apiConfig, frame) {
    debug('validate all');

    let validationErrors = validate(apiConfig.options, frame.options);

    if (!_.isEmpty(validationErrors)) {
        return Promise.reject(validationErrors[0]);
    }

    if (frame.data) {
        validationErrors = validate(apiConfig.data, frame.data);
    }

    if (!_.isEmpty(validationErrors)) {
        return Promise.reject(validationErrors[0]);
    }

    return Promise.resolve();
};
