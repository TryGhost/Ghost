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

        if (GLOBAL_VALIDATORS[key]) {
            debug('global validation');
            errors = errors.concat(validation.validate(value, key, GLOBAL_VALIDATORS[key]));
        }

        if (config && config[key]) {
            const allowedValues = Array.isArray(config[key]) ? config[key] : config[key].values;

            if (allowedValues) {
                debug('ctrl validation');

                // CASE: we allow e.g. `formats=`
                if (!value || !value.length) {
                    return;
                }

                const valuesAsArray = Array.isArray(value) ? value : value.trim().toLowerCase().split(',');
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
        }
    });

    return errors;
};

module.exports = {
    all(apiConfig, frame) {
        debug('validate all');

        let validationErrors = validate(apiConfig.options, frame.options);

        if (!_.isEmpty(validationErrors)) {
            return Promise.reject(validationErrors[0]);
        }

        return Promise.resolve();
    },

    browse(apiConfig, frame) {
        debug('validate browse');

        let validationErrors = [];

        if (frame.data) {
            validationErrors = validate(apiConfig.data, frame.data);
        }

        if (!_.isEmpty(validationErrors)) {
            return Promise.reject(validationErrors[0]);
        }
    },

    read() {
        debug('validate read');
        return this.browse(...arguments);
    },

    add(apiConfig, frame) {
        debug('validate add');

        if (_.isEmpty(frame.data) || _.isEmpty(frame.data[apiConfig.docName]) || _.isEmpty(frame.data[apiConfig.docName][0])) {
            return Promise.reject(new common.errors.BadRequestError({
                message: common.i18n.t('errors.api.utils.noRootKeyProvided', {docName: apiConfig.docName})
            }));
        }

        const jsonpath = require('jsonpath');

        if (apiConfig.data) {
            const missedDataProperties = _.filter(apiConfig.data, (value, key) => {
                return jsonpath.query(frame.data[apiConfig.docName][0], key).length === 0;
            });

            if (missedDataProperties.length) {
                return Promise.reject(new common.errors.ValidationError({
                    message: common.i18n.t('notices.data.validation.index.validationFailed', {
                        validationName: 'FieldIsRequired'
                    })
                }));
            }
        }
    },

    edit(apiConfig, frame) {
        debug('validate edit');
        const result = this.add(...arguments);

        if (result instanceof Promise) {
            return result;
        }

        if (frame.options.id && frame.data[apiConfig.docName][0].id
            && frame.options.id !== frame.data[apiConfig.docName][0].id) {
            return Promise.reject(new common.errors.BadRequestError({
                message: common.i18n.t('errors.api.utils.invalidIdProvided')
            }));
        }
    },

    changePassword() {
        debug('validate changePassword');
        return this.add(...arguments);
    }
};
