import { createRequire } from 'node:module';
import errors from '@tryghost/errors';
import { Ajv, type SchemaObject } from 'ajv';
import { addIsLowercaseKeyword } from './is-lowercase-keyword.js';

const require = createRequire(import.meta.url);
// ajv-formats is CommonJS and its default export is not callable under NodeNext's type resolution.
const addFormats: typeof import('ajv-formats').default = require('ajv-formats');

export interface IdentifiedSchema extends SchemaObject {
  $id: string;
}

function createValidator(rejectUnknownFields: boolean): Ajv {
  const ajv = new Ajv({
    allErrors: true,
    useDefaults: true,
    removeAdditional: !rejectUnknownFields,
  });

  addFormats(ajv);

  ajv.addFormat('json-string', {
    type: 'string',
    validate: (data: string) => {
      try {
        JSON.parse(data);
        return true;
      } catch {
        return false;
      }
    },
  });

  addIsLowercaseKeyword(ajv);

  return ajv;
}

const ajv = createValidator(false);
const strictAjv = createValidator(true);

const getValidation = (validator: Ajv, schema: IdentifiedSchema, definition: IdentifiedSchema) => {
  if (!validator.getSchema(definition.$id)) {
    validator.addSchema(definition);
  }

  return validator.getSchema(schema.$id) ?? validator.compile(schema);
};

export async function validate(
  schema: IdentifiedSchema,
  definition: IdentifiedSchema,
  data: unknown,
  rejectUnknownFields = false,
): Promise<void> {
  const validation = getValidation(rejectUnknownFields ? strictAjv : ajv, schema, definition);

  validation(data);

  if (validation.errors) {
    const instancePath = validation.errors[0]?.instancePath;
    const key = instancePath ? instancePath.split('/').pop() : schema.$id?.split('.')[0];

    throw new errors.ValidationError({
      message: `Validation failed for ${key}.`,
      property: key,
      errorDetails: validation.errors,
    });
  }
}
