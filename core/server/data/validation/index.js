var schema    = require('../schema').tables,
    _         = require('lodash'),
    validator = require('validator'),
    when      = require('when'),

    validateSchema,
    validateSettings,
    validate;

// Validation validation against schema attributes
// values are checked against the validation objects
// form schema.js
validateSchema = function (tableName, model) {
    var columns = _.keys(schema[tableName]);

    _.each(columns, function (columnKey) {
        // check nullable
        if (model.hasOwnProperty(columnKey) && schema[tableName][columnKey].hasOwnProperty('nullable')
                && schema[tableName][columnKey].nullable !== true) {
            validator.check(model[columnKey], 'Value in [' + tableName + '.' + columnKey +
                '] cannot be blank.').notNull();
            validator.check(model[columnKey], 'Value in [' + tableName + '.' + columnKey +
                '] cannot be blank.').notEmpty();
        }
        // TODO: check if mandatory values should be enforced
        if (model[columnKey]) {
            // check length
            if (schema[tableName][columnKey].hasOwnProperty('maxlength')) {
                validator.check(model[columnKey], 'Value in [' + tableName + '.' + columnKey +
                    '] exceeds maximum length of %2 characters.').len(0, schema[tableName][columnKey].maxlength);
            }

            //check validations objects
            if (schema[tableName][columnKey].hasOwnProperty('validations')) {
                validate(model[columnKey], columnKey, schema[tableName][columnKey].validations);
            }

            //check type
            if (schema[tableName][columnKey].hasOwnProperty('type')) {
                if (schema[tableName][columnKey].type === 'integer') {
                    validator.check(model[columnKey], 'Value in [' + tableName + '.' + columnKey +
                        '] is no valid integer.' + model[columnKey]).isInt();
                }
            }
        }
    });
};

// Validation for settings
// settings are checked against the validation objects
// form default-settings.json
validateSettings = function (defaultSettings, model) {
    var values = model.toJSON(),
        matchingDefault = defaultSettings[values.key];

    if (matchingDefault && matchingDefault.validations) {
        validate(values.value, values.key, matchingDefault.validations);
    }
};

// Validate using the validation module.
// Each validation's key is a name and its value is an array of options
// Use true (boolean) if options aren't applicable
//
// eg:
//      validations: { isUrl: true, len: [20, 40] }
//
// will validate that a values's length is a URL between 20 and 40 chars,
// available validators: https://github.com/chriso/node-validator#list-of-validation-methods
validate = function (value, key, validations) {
    _.each(validations, function (validationOptions, validationName) {
        var validation = validator.check(value, 'Validation [' + validationName + '] of field [' + key + '] failed.');

        if (validationOptions === true) {
            validationOptions = null;
        }
        if (typeof validationOptions !== 'array') {
            validationOptions = [validationOptions];
        }

        // equivalent of validation.isSomething(option1, option2)
        validation[validationName].apply(validation, validationOptions);
    }, this);
};

module.exports = {
    validateSchema: validateSchema,
    validateSettings: validateSettings
};