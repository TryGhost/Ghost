const _ = require('lodash');
const Promise = require('bluebird');

const i18n = require('../../../shared/i18n');
const errors = require('@tryghost/errors');

const schema = require('../schema').tables;
const validator = require('./validator');
const validate = require('./validate');

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
module.exports = validateSchema;
