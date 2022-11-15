import traverse from 'json-schema-traverse';
import { schema as schemaFn } from '@stoplight/spectral-functions';
import { createRulesetFunction } from '@stoplight/spectral-core';
import { oas2, oas3_1, extractDraftVersion, oas3_0 } from '@stoplight/spectral-formats';
import { isPlainObject, pointerToPath } from '@stoplight/json';

function rewriteNullable(schema, errors) {
  for (const error of errors) {
    if (error.keyword !== 'type') continue;
    const value = getSchemaProperty(schema, error.schemaPath);
    if (isPlainObject(value) && value.nullable === true) {
      error.message += ',null';
    }
  }
}

export default createRulesetFunction(
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
