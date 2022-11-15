import { isPlainObject, pointerToPath } from '@stoplight/json';
import { createRulesetFunction } from '@stoplight/spectral-core';
import { oas2, oas3_1, extractDraftVersion, oas3_0 } from '@stoplight/spectral-formats';
import { schema as schemaFn } from '@stoplight/spectral-functions';
import traverse from 'json-schema-traverse';

const MEDIA_VALIDATION_ITEMS = {
  2: [
    {
      field: 'examples',
      multiple: true,
      keyed: false,
    },
  ],
  3: [
    {
      field: 'example',
      multiple: false,
      keyed: false,
    },
    {
      field: 'examples',
      multiple: true,
      keyed: true,
    },
  ],
};

const SCHEMA_VALIDATION_ITEMS = {
  2: ['example', 'x-example', 'default'],
  3: ['example', 'default'],
};

function isObject(value) {
  return value !== null && typeof value === 'object';
}

function rewriteNullable(schema, errors) {
  for (const error of errors) {
    if (error.keyword !== 'type') continue;
    const value = getSchemaProperty(schema, error.schemaPath);
    if (isPlainObject(value) && value.nullable === true) {
      error.message += ',null';
    }
  }
}

const visitOAS2 = schema => {
  if (schema['x-nullable'] === true) {
    schema.nullable = true;
    delete schema['x-nullable'];
  }
};

function getSchemaProperty(schema, schemaPath) {
  const path = pointerToPath(schemaPath);
  let value = schema;

  for (const fragment of path.slice(0, -1)) {
    if (!isPlainObject(value)) {
      return;
    }

    value = value[fragment];
  }

  return value;
}

const oasSchema = createRulesetFunction(
  {
    input: null,
    options: {
      type: 'object',
      properties: {
        schema: {
          type: 'object',
        },
      },
      additionalProperties: false,
    },
  },
  function oasSchema(targetVal, opts, context) {
    const formats = context.document.formats;

    let { schema } = opts;

    let dialect = 'draft4';
    let prepareResults;

    if (!formats) {
      dialect = 'auto';
    } else if (formats.has(oas3_1)) {
      if (isPlainObject(context.document.data) && typeof context.document.data.jsonSchemaDialect === 'string') {
        dialect = extractDraftVersion(context.document.data.jsonSchemaDialect) ?? 'draft2020-12';
      } else {
        dialect = 'draft2020-12';
      }
    } else if (formats.has(oas3_0)) {
      prepareResults = rewriteNullable.bind(null, schema);
    } else if (formats.has(oas2)) {
      const clonedSchema = JSON.parse(JSON.stringify(schema));
      traverse(clonedSchema, visitOAS2);
      schema = clonedSchema;
      prepareResults = rewriteNullable.bind(null, clonedSchema);
    }

    return schemaFn(
      targetVal,
      {
        ...opts,
        schema,
        prepareResults,
        dialect,
      },
      context,
    );
  },
);

function* getMediaValidationItems(items, targetVal, givenPath, oasVersion) {
  for (const { field, keyed, multiple } of items) {
    if (!(field in targetVal)) {
      continue;
    }

    const value = targetVal[field];

    if (multiple) {
      if (!isObject(value)) continue;

      for (const exampleKey of Object.keys(value)) {
        const exampleValue = value[exampleKey];
        if (oasVersion === 3 && keyed && (!isObject(exampleValue) || 'externalValue' in exampleValue)) {
          // should be covered by oas3-examples-value-or-externalValue
          continue;
        }

        const targetPath = [...givenPath, field, exampleKey];

        if (keyed) {
          targetPath.push('value');
        }

        yield {
          value: keyed && isObject(exampleValue) ? exampleValue.value : exampleValue,
          path: targetPath,
        };
      }

      return;
    } else {
      return yield {
        value,
        path: [...givenPath, field],
      };
    }
  }
}

function* getSchemaValidationItems(fields, targetVal, givenPath) {
  for (const field of fields) {
    if (!(field in targetVal)) {
      continue;
    }

    yield {
      value: targetVal[field],
      path: [...givenPath, field],
    };
  }
}

export default createRulesetFunction(
  {
    input: {
      type: 'object',
    },
    options: {
      type: 'object',
      properties: {
        oasVersion: {
          enum: ['2', '3'],
        },
        schemaField: {
          type: 'string',
        },
        type: {
          enum: ['media', 'schema'],
        },
      },
      additionalProperties: false,
    },
  },
  function oasExample(targetVal, opts, context) {
    const formats = context.document.formats;
    const schemaOpts = {
      schema: opts.schemaField === '$' ? targetVal : targetVal[opts.schemaField],
    };

    let results = void 0;
    let oasVersion = parseInt(opts.oasVersion);

    const validationItems =
      opts.type === 'schema'
        ? getSchemaValidationItems(SCHEMA_VALIDATION_ITEMS[oasVersion], targetVal, context.path)
        : getMediaValidationItems(MEDIA_VALIDATION_ITEMS[oasVersion], targetVal, context.path, oasVersion);

    if (formats?.has(oas2) && 'required' in schemaOpts.schema && typeof schemaOpts.schema.required === 'boolean') {
      schemaOpts.schema = { ...schemaOpts.schema };
      delete schemaOpts.schema.required;
    }

    for (const validationItem of validationItems) {
      const result = oasSchema(validationItem.value, schemaOpts, {
        ...context,
        path: validationItem.path,
      });

      if (Array.isArray(result)) {
        if (results === void 0) results = [];
        results.push(...result);
      }
    }

    return results;
  },
);
