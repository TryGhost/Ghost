const debug = require('@tryghost/debug')('api:shared:validators:input:all');
const _ = require('lodash');
const Promise = require('bluebird');
const i18n = require('../../../../../shared/i18n');
const {BadRequestError, ValidationError} = require('@tryghost/errors');
const validator = require('@tryghost/validator');

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
            errors.push(new ValidationError({
                message: i18n.t('notices.data.validation.index.validationFailed', {
                    validationName: 'FieldIsRequired',
                    key: key
                })
            }));
        }
    });

    _.each(attrs, (value, key) => {
        debug(key, value);

        if (GLOBAL_VALIDATORS[key]) {
            debug('global validation');
            errors = errors.concat(validator.validate(value, key, GLOBAL_VALIDATORS[key]));
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
                const unallowedValues = _.filter(valuesAsArray, (valueToFilter) => {
                    return !allowedValues.includes(valueToFilter);
                });

                if (unallowedValues.length) {
                    // CASE: we do not error for invalid includes, just silently remove
                    if (key === 'include') {
                        attrs.include = valuesAsArray.filter(x => allowedValues.includes(x));
                        return;
                    }

                    errors.push(new ValidationError({
                        message: i18n.t('notices.data.validation.index.validationFailed', {
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

        // NOTE: this block should be removed completely once JSON Schema validations
        //       are introduced for all of the endpoints
        if (!['posts', 'tags'].includes(apiConfig.docName)) {
            if (_.isEmpty(frame.data) || _.isEmpty(frame.data[apiConfig.docName]) || _.isEmpty(frame.data[apiConfig.docName][0])) {
                return Promise.reject(new BadRequestError({
                    message: i18n.t('errors.api.utils.noRootKeyProvided', {docName: apiConfig.docName})
                }));
            }
        }

        const jsonpath = require('jsonpath');

        if (apiConfig.data) {
            const missedDataProperties = [];
            const nilDataProperties = [];

            _.each(apiConfig.data, (value, key) => {
                if (jsonpath.query(frame.data[apiConfig.docName][0], key).length === 0) {
                    missedDataProperties.push(key);
                } else if (_.isNil(frame.data[apiConfig.docName][0][key])) {
                    nilDataProperties.push(key);
                }
            });

            if (missedDataProperties.length) {
                return Promise.reject(new ValidationError({
                    message: i18n.t('notices.data.validation.index.validationFailed', {
                        validationName: 'FieldIsRequired',
                        key: JSON.stringify(missedDataProperties)
                    })
                }));
            }

            if (nilDataProperties.length) {
                return Promise.reject(new ValidationError({
                    message: i18n.t('notices.data.validation.index.validationFailed', {
                        validationName: 'FieldIsInvalid',
                        key: JSON.stringify(nilDataProperties)
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

        // NOTE: this block should be removed completely once JSON Schema validations
        //       are introduced for all of the endpoints. `id` property is currently
        //       stripped from the request body and only the one provided in `options`
        //       is used in later logic
        if (!['posts', 'tags'].includes(apiConfig.docName)) {
            if (frame.options.id && frame.data[apiConfig.docName][0].id
                && frame.options.id !== frame.data[apiConfig.docName][0].id) {
                return Promise.reject(new BadRequestError({
                    message: i18n.t('errors.api.utils.invalidIdProvided')
                }));
            }
        }
    },

    changePassword() {
        debug('validate changePassword');
        return this.add(...arguments);
    },

    resetPassword() {
        debug('validate resetPassword');
        return this.add(...arguments);
    },

    setup() {
        debug('validate setup');
        return this.add(...arguments);
    },

    publish() {
        debug('validate schedule');
        return this.browse(...arguments);
    }
};
