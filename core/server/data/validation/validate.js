const _ = require('lodash');
const validator = require('./validator');
const i18n = require('../../../shared/i18n');
const errors = require('@tryghost/errors');

/**
 * Validate keys using the validator module.
 * Each validation's key is a method name and its value is an array of options
 * eg:
 *       validations: { isURL: true, isLength: [20, 40] }
 * will validate that a values's length is a URL between 20 and 40 chars.
 *
 * If you pass a boolean as the value, it will specify the "good" result. By default
 * the "good" result is assumed to be true.
 * eg:
 *       validations: { isNull: false } // means the "good" result would
 *                                      // fail the `isNull` check, so
 *                                      // not null.
 *
 * available validators: https://github.com/chriso/validator.js#validators
 * @param {String} value the value to validate.
 * @param {String} key the db column key of the value to validate.
 * @param {Object} validations the validations object as described above.
 * @param {String} tableName (optional) the db table of the value to validate, used for error message.
 * @return {Array} returns an Array including the found validation errors (empty if none found);
 */
function validate(value, key, validations, tableName) {
    const validationErrors = [];
    let translation;
    value = _.toString(value);

    _.each(validations, function each(validationOptions, validationName) {
        let goodResult = true;

        if (_.isBoolean(validationOptions)) {
            goodResult = validationOptions;
            validationOptions = [];
        } else if (!_.isArray(validationOptions)) {
            validationOptions = [validationOptions];
        }

        validationOptions.unshift(value);

        // equivalent of validator.isSomething(option1, option2)
        if (validator[validationName].apply(validator, validationOptions) !== goodResult) {
            // CASE: You can define specific translations for validators e.g. isLength
            if (i18n.doesTranslationKeyExist('notices.data.validation.index.validationFailedTypes.' + validationName)) {
                translation = i18n.t('notices.data.validation.index.validationFailedTypes.' + validationName, _.merge({
                    validationName: validationName,
                    key: key,
                    tableName: tableName
                }, validationOptions[1]));
            } else {
                translation = i18n.t('notices.data.validation.index.validationFailed', {
                    validationName: validationName,
                    key: key
                });
            }

            validationErrors.push(new errors.ValidationError({
                message: translation,
                context: `${tableName}.${key}`
            }));
        }

        validationOptions.shift();
    }, this);

    return validationErrors;
}

module.exports = validate;
