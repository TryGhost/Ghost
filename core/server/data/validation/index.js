const schema = require('../schema').tables;
const _ = require('lodash');
const validator = require('validator');
const moment = require('moment-timezone');
const assert = require('assert');
const Promise = require('bluebird');
const {i18n} = require('../../lib/common');
const errors = require('@tryghost/errors');
const settingsCache = require('../../services/settings/cache');
const urlUtils = require('../../../shared/url-utils');

function assertString(input) {
    assert(typeof input === 'string', 'Validator js validates strings only');
}

/**
 * Counts repeated characters in a string. When 50% or more characters are the same,
 * we return false and therefore invalidate the string.
 * @param {String} stringToTest The password string to check.
 * @return {Boolean}
 */
function characterOccurance(stringToTest) {
    const chars = {};
    let allowedOccurancy;
    let valid = true;

    stringToTest = _.toString(stringToTest);
    allowedOccurancy = stringToTest.length / 2;

    // Loop through string and accumulate character counts
    _.each(stringToTest, function (char) {
        if (!chars[char]) {
            chars[char] = 1;
        } else {
            chars[char] += 1;
        }
    });

    // check if any of the accumulated chars exceed the allowed occurancy
    // of 50% of the words' length.
    _.forIn(chars, function (charCount) {
        if (charCount >= allowedOccurancy) {
            valid = false;
        }
    });

    return valid;
}

// extends has been removed in validator >= 5.0.0, need to monkey-patch it back in
// @TODO: We modify the global validator dependency here! https://github.com/chriso/validator.js/issues/525#issuecomment-213149570
validator.extend = function (name, fn) {
    validator[name] = function () {
        const args = Array.prototype.slice.call(arguments);
        assertString(args[0]);
        return fn.apply(validator, args);
    };
};

// Provide a few custom validators
validator.extend('empty', function empty(str) {
    return _.isEmpty(str);
});

validator.extend('notContains', function notContains(str, badString) {
    return !_.includes(str, badString);
});

validator.extend('isTimezone', function isTimezone(str) {
    return moment.tz.zone(str) ? true : false;
});

validator.extend('isEmptyOrURL', function isEmptyOrURL(str) {
    return (_.isEmpty(str) || validator.isURL(str, {require_protocol: false}));
});

validator.extend('isSlug', function isSlug(str) {
    return validator.matches(str, /^[a-z0-9\-_]+$/);
});

/**
 * Validation against simple password rules
 * Returns false when validation fails and true for a valid password
 * @param {String} password The password string to check.
 * @param {String} email The users email address to validate agains password.
 * @param {String} blogTitle Optional blogTitle value, when blog title is not set yet, e. g. in setup process.
 * @return {Object} example for returned validation Object:
 * invalid password: `validationResult: {isValid: false, message: 'Sorry, you cannot use an insecure password.'}`
 * valid password: `validationResult: {isValid: true}`
 */
function validatePassword(password, email, blogTitle) {
    const validationResult = {isValid: true};
    const disallowedPasswords = ['password', 'ghost', 'passw0rd'];
    let blogUrl = urlUtils.urlFor('home', true);

    const badPasswords = [
        '1234567890',
        'qwertyuiop',
        'qwertzuiop',
        'asdfghjkl;',
        'abcdefghij',
        '0987654321',
        '1q2w3e4r5t',
        '12345asdfg'
    ];

    blogTitle = blogTitle ? blogTitle : settingsCache.get('title');
    blogUrl = blogUrl.replace(/^http(s?):\/\//, '');

    // password must be longer than 10 characters
    if (!validator.isLength(password, 10)) {
        validationResult.isValid = false;
        validationResult.message = i18n.t('errors.models.user.passwordDoesNotComplyLength', {minLength: 10});

        return validationResult;
    }

    // dissallow password from badPasswords list (e. g. '1234567890')
    _.each(badPasswords, function (badPassword) {
        if (badPassword === password) {
            validationResult.isValid = false;
        }
    });

    // password must not match with users' email
    if (email && email.toLowerCase() === password.toLowerCase()) {
        validationResult.isValid = false;
    }

    // password must not contain the words 'ghost', 'password', or 'passw0rd'
    _.each(disallowedPasswords, function (disallowedPassword) {
        if (password.toLowerCase().indexOf(disallowedPassword) >= 0) {
            validationResult.isValid = false;
        }
    });

    // password must not match with blog title
    if (blogTitle && blogTitle.toLowerCase() === password.toLowerCase()) {
        validationResult.isValid = false;
    }

    // password must not match with blog URL (without protocol, with or without trailing slash)
    if (blogUrl && (blogUrl.toLowerCase() === password.toLowerCase() || blogUrl.toLowerCase().replace(/\/$/, '') === password.toLowerCase())) {
        validationResult.isValid = false;
    }

    // dissallow passwords where 50% or more of characters are the same
    if (!characterOccurance(password)) {
        validationResult.isValid = false;
    }

    // Generic error message for the rules where no dedicated error massage is set
    if (!validationResult.isValid && !validationResult.message) {
        validationResult.message = i18n.t('errors.models.user.passwordDoesNotComplySecurity');
    }

    return validationResult;
}

/**
 * Validate model against schema.
 *
 * ## on model update
 * - only validate changed fields
 * - otherwise we could throw errors which the user is out of control
 * - e.g.
 *   - we add a new field without proper validation, release goes out
 *   - we add proper validation for a single field
 * - if you call `user.save()` the default fallback in bookshelf is `options.method=update`.
 * - we set `options.method` explicit for adding resources (because otherwise bookshelf uses `update`)
 *
 * ## on model add
 * - validate everything to catch required fields
 */
function validateSchema(tableName, model, options) {
    options = options || {};

    const columns = _.keys(schema[tableName]);
    let validationErrors = [];

    _.each(columns, function each(columnKey) {
        let message = ''; // KEEP: Validator.js only validates strings.
        const strVal = _.toString(model.get(columnKey));

        if (options.method !== 'insert' && !_.has(model.changed, columnKey)) {
            return;
        }

        // check nullable
        if (Object.prototype.hasOwnProperty.call(schema[tableName][columnKey], 'nullable') &&
            schema[tableName][columnKey].nullable !== true &&
            !Object.prototype.hasOwnProperty.call(schema[tableName][columnKey], 'defaultTo')
        ) {
            if (validator.empty(strVal)) {
                message = i18n.t('notices.data.validation.index.valueCannotBeBlank', {
                    tableName: tableName,
                    columnKey: columnKey
                });
                validationErrors.push(new errors.ValidationError({
                    message: message,
                    context: tableName + '.' + columnKey
                }));
            }
        }

        // validate boolean columns
        if (Object.prototype.hasOwnProperty.call(schema[tableName][columnKey], 'type')
            && schema[tableName][columnKey].type === 'bool') {
            if (!(validator.isBoolean(strVal) || validator.empty(strVal))) {
                message = i18n.t('notices.data.validation.index.valueMustBeBoolean', {
                    tableName: tableName,
                    columnKey: columnKey
                });
                validationErrors.push(new errors.ValidationError({
                    message: message,
                    context: tableName + '.' + columnKey
                }));
            }

            // CASE: ensure we transform 0|1 to false|true
            if (!validator.empty(strVal)) {
                model.set(columnKey, !!model.get(columnKey));
            }
        }

        // TODO: check if mandatory values should be enforced
        if (model.get(columnKey) !== null && model.get(columnKey) !== undefined) {
            // check length
            if (Object.prototype.hasOwnProperty.call(schema[tableName][columnKey], 'maxlength')) {
                if (!validator.isLength(strVal, 0, schema[tableName][columnKey].maxlength)) {
                    message = i18n.t('notices.data.validation.index.valueExceedsMaxLength',
                        {
                            tableName: tableName,
                            columnKey: columnKey,
                            maxlength: schema[tableName][columnKey].maxlength
                        });
                    validationErrors.push(new errors.ValidationError({
                        message: message,
                        context: tableName + '.' + columnKey
                    }));
                }
            }

            // check validations objects
            if (Object.prototype.hasOwnProperty.call(schema[tableName][columnKey], 'validations')) {
                validationErrors = validationErrors.concat(validate(strVal, columnKey, schema[tableName][columnKey].validations, tableName));
            }

            // check type
            if (Object.prototype.hasOwnProperty.call(schema[tableName][columnKey], 'type')) {
                if (schema[tableName][columnKey].type === 'integer' && !validator.isInt(strVal)) {
                    message = i18n.t('notices.data.validation.index.valueIsNotInteger', {
                        tableName: tableName,
                        columnKey: columnKey
                    });
                    validationErrors.push(new errors.ValidationError({
                        message: message,
                        context: tableName + '.' + columnKey
                    }));
                }
            }
        }
    });

    if (validationErrors.length !== 0) {
        return Promise.reject(validationErrors);
    }

    return Promise.resolve();
}

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

module.exports = {
    validate,
    validator,
    validatePassword,
    validateSchema
};
