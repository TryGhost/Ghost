import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import _ from 'lodash';
import type { ReadonlyDeep } from 'type-fest';
// @ts-expect-error This module lacks type definitions.
import validator from '@tryghost/validator';
// @ts-expect-error This module lacks type definitions.
import schema from './schema';

const messages = {
  valueCannotBeBlank: 'Value in [{tableName}.{columnKey}] cannot be blank.',
  valueMustBeBoolean: 'Value in [{tableName}.{columnKey}] must be one of true, false, 0 or 1.',
  valueExceedsMaxLength:
    'Value in [{tableName}.{columnKey}] exceeds maximum length of {maxlength} characters.',
  valueIsNotInteger: 'Value in [{tableName}.{columnKey}] is not an integer.',
};

type Model = {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
  changed: Record<string, unknown>;
};

type Options = ReadonlyDeep<{
  method?: 'insert' | 'update';
}>;

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
export function validateSchema(tableName: string, model: Model, options?: Options) {
  options = options || {};

  const columns = _.keys(schema[tableName]);
  let validationErrors: errors.ValidationError[] = [];

  _.each(columns, function each(columnKey) {
    let message = ''; // KEEP: Validator.js only validates strings.

    if (options.method !== 'insert' && !_.has(model.changed, columnKey)) {
      return;
    }

    const val = model.get(columnKey);
    const strVal = _.toString(val);
    const column = schema[tableName][columnKey];

    // check nullable
    if (
      Object.hasOwn(column, 'nullable') &&
      column.nullable !== true &&
      Object.hasOwn(column, 'type') &&
      column.type !== 'text' &&
      !Object.hasOwn(column, 'defaultTo')
    ) {
      if (validator.isEmpty(strVal) && !(column.allowEmpty && val === '')) {
        message = tpl(messages.valueCannotBeBlank, {
          tableName: tableName,
          columnKey: columnKey,
        });
        validationErrors.push(
          new errors.ValidationError({
            message: message,
            context: tableName + '.' + columnKey,
          }),
        );
      }
    }

    // validate boolean columns
    if (Object.hasOwn(column, 'type') && column.type === 'boolean') {
      if (!(validator.isBoolean(strVal) || validator.isEmpty(strVal))) {
        message = tpl(messages.valueMustBeBoolean, {
          tableName: tableName,
          columnKey: columnKey,
        });
        validationErrors.push(
          new errors.ValidationError({
            message: message,
            context: tableName + '.' + columnKey,
          }),
        );
      }

      // CASE: ensure we transform 0|1 to false|true
      if (!validator.isEmpty(strVal)) {
        model.set(columnKey, !!model.get(columnKey));
      }
    }

    // TODO: check if mandatory values should be enforced
    if (model.get(columnKey) !== null && model.get(columnKey) !== undefined) {
      // check length
      if (Object.hasOwn(column, 'maxlength')) {
        if (!validator.isLength(strVal, 0, column.maxlength)) {
          message = tpl(messages.valueExceedsMaxLength, {
            tableName: tableName,
            columnKey: columnKey,
            maxlength: column.maxlength,
          });
          validationErrors.push(
            new errors.ValidationError({
              message: message,
              context: tableName + '.' + columnKey,
            }),
          );
        }
      }

      // check validations objects
      if (Object.hasOwn(column, 'validations')) {
        validationErrors = validationErrors.concat(
          validator.validate(strVal, columnKey, column.validations, tableName),
        );
      }

      // check type
      if (Object.hasOwn(column, 'type')) {
        if (column.type === 'integer' && !validator.isInt(strVal)) {
          message = tpl(messages.valueIsNotInteger, {
            tableName: tableName,
            columnKey: columnKey,
          });
          validationErrors.push(
            new errors.ValidationError({
              message: message,
              context: tableName + '.' + columnKey,
            }),
          );
        }
      }
    }
  });

  if (validationErrors.length !== 0) {
    throw validationErrors;
  }
}
