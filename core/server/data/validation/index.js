var schema    = require('../schema').tables,
    _         = require('lodash'),
    validator = require('validator'),
    Promise   = require('bluebird'),
    errors    = require('../../errors'),
    config    = require('../../config'),
    requireTree = require('../../require-tree').readAll,

    validateSchema,
    validateSettings,
    validateActiveTheme,
    validate,

    availableThemes;

// Provide a few custom validators
//
validator.extend('empty', function (str) {
    return _.isEmpty(str);
});

validator.extend('notContains', function (str, badString) {
    return !_.contains(str, badString);
});

validator.extend('isEmptyOrURL', function (str) {
    return (_.isEmpty(str) || validator.isURL(str, {require_protocol: false}));
});

// Validation validation against schema attributes
// values are checked against the validation objects
// form schema.js
validateSchema = function (tableName, model) {
    var columns = _.keys(schema[tableName]),
        validationErrors = [];

    _.each(columns, function (columnKey) {
        var message = '';

        // check nullable
        if (model.hasOwnProperty(columnKey) && schema[tableName][columnKey].hasOwnProperty('nullable')
                && schema[tableName][columnKey].nullable !== true) {
            if (validator.isNull(model[columnKey]) || validator.empty(model[columnKey])) {
                message = 'Value in [' + tableName + '.' + columnKey + '] cannot be blank.';
                validationErrors.push(new errors.ValidationError(message, tableName + '.' + columnKey));
            }
        }

        // TODO: check if mandatory values should be enforced
        if (model[columnKey] !== null && model[columnKey] !== undefined) {
            // check length
            if (schema[tableName][columnKey].hasOwnProperty('maxlength')) {
                if (!validator.isLength(model[columnKey], 0, schema[tableName][columnKey].maxlength)) {
                    message = 'Value in [' + tableName + '.' + columnKey + '] exceeds maximum length of '
                        + schema[tableName][columnKey].maxlength + ' characters.';
                    validationErrors.push(new errors.ValidationError(message, tableName + '.' + columnKey));
                }
            }

            // check validations objects
            if (schema[tableName][columnKey].hasOwnProperty('validations')) {
                validationErrors = validationErrors.concat(validate(model[columnKey], columnKey, schema[tableName][columnKey].validations));
            }

            // check type
            if (schema[tableName][columnKey].hasOwnProperty('type')) {
                if (schema[tableName][columnKey].type === 'integer' && !validator.isInt(model[columnKey])) {
                    message = 'Value in [' + tableName + '.' + columnKey + '] is not an integer.';
                    validationErrors.push(new errors.ValidationError(message, tableName + '.' + columnKey));
                }
            }
        }
    });

    if (validationErrors.length !== 0) {
        return Promise.reject(validationErrors);
    }

    return Promise.resolve();
};

// Validation for settings
// settings are checked against the validation objects
// form default-settings.json
validateSettings = function (defaultSettings, model) {
    var values = model.toJSON(),
        validationErrors = [],
        matchingDefault = defaultSettings[values.key];

    if (matchingDefault && matchingDefault.validations) {
        validationErrors = validationErrors.concat(validate(values.value, values.key, matchingDefault.validations));
    }

    if (validationErrors.length !== 0) {
        return Promise.reject(validationErrors);
    }

    return Promise.resolve();
};

validateActiveTheme = function (themeName) {
    // If Ghost is running and its availableThemes collection exists
    // give it priority.
    if (config.paths.availableThemes && Object.keys(config.paths.availableThemes).length > 0) {
        availableThemes = Promise.resolve(config.paths.availableThemes);
    }

    if (!availableThemes) {
        // A Promise that will resolve to an object with a property for each installed theme.
        // This is necessary because certain configuration data is only available while Ghost
        // is running and at times the validations are used when it's not (e.g. tests)
        availableThemes = requireTree(config.paths.themePath);
    }

    return availableThemes.then(function (themes) {
        if (!themes.hasOwnProperty(themeName)) {
            return Promise.reject(new errors.ValidationError(themeName + ' cannot be activated because it is not currently installed.', 'activeTheme'));
        }
    });
};

// Validate default settings using the validator module.
// Each validation's key is a method name and its value is an array of options
//
// eg:
//      validations: { isURL: true, isLength: [20, 40] }
//
// will validate that a setting's length is a URL between 20 and 40 chars.
//
// If you pass a boolean as the value, it will specify the "good" result. By default
// the "good" result is assumed to be true.
//
// eg:
//      validations: { isNull: false }  // means the "good" result would
//                                      // fail the `isNull` check, so
//                                      // not null.
//
// available validators: https://github.com/chriso/validator.js#validators
validate = function (value, key, validations) {
    var validationErrors = [];

    _.each(validations, function (validationOptions, validationName) {
        var goodResult = true;

        if (_.isBoolean(validationOptions)) {
            goodResult = validationOptions;
            validationOptions = [];
        } else if (!_.isArray(validationOptions)) {
            validationOptions = [validationOptions];
        }

        validationOptions.unshift(value);

        // equivalent of validator.isSomething(option1, option2)
        if (validator[validationName].apply(validator, validationOptions) !== goodResult) {
            validationErrors.push(new errors.ValidationError('Validation (' + validationName + ') failed for ' + key, key));
        }

        validationOptions.shift();
    }, this);

    return validationErrors;
};

module.exports = {
    validateSchema: validateSchema,
    validateSettings: validateSettings,
    validateActiveTheme: validateActiveTheme
};
