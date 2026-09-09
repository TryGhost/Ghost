import createDebug from '@tryghost/debug';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import validator from '@tryghost/validator';
import _ from 'lodash';
import type { Dictionary } from '../../frame.ts';
import type { ApiConfiguration } from '../../pipeline.ts';

const debug = createDebug('validators:input:all');
const { BadRequestError, ValidationError } = errors;
interface ValidationRule extends Dictionary {
  required?: boolean;
  values?: unknown[];
}
type ValidationConfiguration = Record<string, ValidationRule | unknown[]>;
type OptionsFrame = { options: Dictionary };
type DataFrame = { data?: Dictionary };
type EditFrame = { data?: Dictionary; options?: Dictionary };

const messages = {
  validationFailed: 'Validation ({validationName}) failed for {key}',
  noRootKeyProvided: "No root key ('{docName}') provided.",
  invalidIdProvided: 'Invalid id provided.',
};

const GLOBAL_VALIDATORS: Record<string, false | Dictionary> = {
  id: { matches: /^(?:[a-f\d]{24}|1|me)$/i },
  page: { matches: /^\d+$/ },
  limit: { matches: /^(?:\d+|all)$/ },
  from: { isDate: true },
  to: { isDate: true },
  columns: { matches: /^[\w, ]+$/ },
  order: { matches: /^[a-z0-9_,. ]+$/i },
  uuid: { isUUID: true },
  slug: { isSlug: true },
  name: {},
  email: { isEmail: true },
  filter: false,
  context: false,
  forUpdate: false,
  transacting: false,
  include: false,
  formats: false,
};

const validate = (config: ValidationConfiguration = {}, attrs: Dictionary = {}) => {
  let validationErrors: Error[] = [];

  Object.entries(config).forEach(([key, value]) => {
    if (!Array.isArray(value) && value.required && !attrs[key]) {
      validationErrors.push(
        new ValidationError({
          message: tpl(messages.validationFailed, {
            validationName: 'FieldIsRequired',
            key: key,
          }),
        }),
      );
    }
  });

  Object.entries(attrs).forEach(([key, value]) => {
    debug(key, value);

    if (GLOBAL_VALIDATORS[key]) {
      debug('global validation');
      validationErrors = validationErrors.concat(
        validator.validate(value, key, GLOBAL_VALIDATORS[key]),
      );
    }

    if (config?.[key]) {
      const rule = config[key];
      const allowedValues = Array.isArray(rule) ? rule : rule.values;

      if (allowedValues) {
        debug('ctrl validation');

        // CASE: we allow e.g. `formats=`
        if (!value || (typeof value !== 'string' && !Array.isArray(value)) || !value.length) {
          return;
        }

        const valuesAsArray = Array.isArray(value) ? value : value.trim().toLowerCase().split(',');
        const unallowedValues = _.filter(valuesAsArray, (valueToFilter: unknown) => {
          return !allowedValues.includes(valueToFilter);
        });

        if (unallowedValues.length) {
          // CASE: we do not error for invalid includes, just silently remove
          if (key === 'include') {
            attrs.include = valuesAsArray.filter((x) => allowedValues.includes(x));
            return;
          }

          validationErrors.push(
            new ValidationError({
              message: tpl(messages.validationFailed, {
                validationName: 'AllowedValues',
                key: key,
              }),
            }),
          );
        }
      }
    }
  });

  return validationErrors;
};

const validators = {
  /**
   * @param {object} apiConfig
   * @param {import('@tryghost/api-framework').Frame} frame
   */
  all(apiConfig: ApiConfiguration, frame: OptionsFrame) {
    debug('validate all');

    const validationErrors = validate(
      apiConfig.options as ValidationConfiguration | undefined,
      frame.options,
    );

    if (!_.isEmpty(validationErrors)) {
      return Promise.reject(validationErrors[0]);
    }
    return Promise.resolve();
  },

  /**
   * @param {object} apiConfig
   * @param {import('@tryghost/api-framework').Frame} frame
   */
  browse(apiConfig: ApiConfiguration, frame: DataFrame) {
    debug('validate browse');

    let validationErrors: Error[] = [];
    const data = frame.data ?? {};

    if (frame.data) {
      validationErrors = validate(
        (apiConfig.data && !Array.isArray(apiConfig.data) && typeof apiConfig.data !== 'function'
          ? apiConfig.data
          : {}) as ValidationConfiguration,
        data,
      );
    }

    if (!_.isEmpty(validationErrors)) {
      return Promise.reject(validationErrors[0]);
    }
    return undefined;
  },

  read(apiConfig: ApiConfiguration, frame: DataFrame) {
    debug('validate read');
    return validators.browse(apiConfig, frame);
  },

  /**
   * @param {object} apiConfig
   * @param {import('@tryghost/api-framework').Frame} frame
   */
  add(apiConfig: ApiConfiguration, frame: DataFrame): Promise<never> | undefined {
    debug('validate add');
    const docName = apiConfig.docName ?? '';
    const data = frame.data ?? {};

    // NOTE: this block should be removed completely once JSON Schema validations
    //       are introduced for all of the endpoints
    if (!['posts', 'tags'].includes(docName)) {
      const resource = data[docName];
      const firstResource = Array.isArray(resource) ? resource[0] : undefined;
      if (_.isEmpty(data) || _.isEmpty(resource) || _.isEmpty(firstResource)) {
        return Promise.reject(
          new BadRequestError({
            message: tpl(messages.noRootKeyProvided, { docName }),
          }),
        );
      }
    }

    const resource = data[docName];
    const row = Array.isArray(resource) ? resource[0] : undefined;
    if (apiConfig.data && row && typeof row === 'object') {
      const missedDataProperties: string[] = [];
      const nilDataProperties: string[] = [];

      Object.keys(apiConfig.data).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(row, key)) {
          missedDataProperties.push(key);
        } else if (_.isNil((row as Dictionary)[key])) {
          nilDataProperties.push(key);
        }
      });

      if (missedDataProperties.length) {
        return Promise.reject(
          new ValidationError({
            message: tpl(messages.validationFailed, {
              validationName: 'FieldIsRequired',
              key: JSON.stringify(missedDataProperties),
            }),
          }),
        );
      }

      if (nilDataProperties.length) {
        return Promise.reject(
          new ValidationError({
            message: tpl(messages.validationFailed, {
              validationName: 'FieldIsInvalid',
              key: JSON.stringify(nilDataProperties),
            }),
          }),
        );
      }
    }
    return undefined;
  },

  /**
   * @param {object} apiConfig
   * @param {import('@tryghost/api-framework').Frame} frame
   */
  edit(apiConfig: ApiConfiguration, frame: EditFrame): Promise<never> | undefined {
    debug('validate edit');
    const docName = apiConfig.docName ?? '';
    const data = frame.data ?? {};
    const options = frame.options ?? {};
    const result = validators.add(apiConfig, frame);

    if (result instanceof Promise) {
      return result;
    }

    // NOTE: this block should be removed completely once JSON Schema validations
    //       are introduced for all of the endpoints. `id` property is currently
    //       stripped from the request body and only the one provided in `options`
    //       is used in later logic
    if (!['posts', 'tags'].includes(docName)) {
      const resource = data[docName];
      const row = Array.isArray(resource) ? resource[0] : undefined;
      if (row && typeof row === 'object' && 'id' in row && options.id !== row.id) {
        return Promise.reject(
          new BadRequestError({
            message: tpl(messages.invalidIdProvided),
          }),
        );
      }
    }
    return undefined;
  },

  changePassword(apiConfig: ApiConfiguration, frame: DataFrame) {
    debug('validate changePassword');
    return validators.add(apiConfig, frame);
  },

  resetPassword(apiConfig: ApiConfiguration, frame: DataFrame) {
    debug('validate resetPassword');
    return validators.add(apiConfig, frame);
  },

  setup(apiConfig: ApiConfiguration, frame: DataFrame) {
    debug('validate setup');
    return validators.add(apiConfig, frame);
  },

  publish(apiConfig: ApiConfiguration, frame: DataFrame) {
    debug('validate schedule');
    return validators.browse(apiConfig, frame);
  },
};

export default validators;
