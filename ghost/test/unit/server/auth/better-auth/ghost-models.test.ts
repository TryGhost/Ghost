import assert from 'node:assert/strict';
import {
  ghostJwtSchema,
  ghostOAuthProviderSchema,
} from '../../../../../core/server/auth/better-auth/ghost-models';
import schema from '../../../../../core/server/data/schema/schema';

const tables = schema as Record<string, Record<string, unknown>>;

describe('ghost-models', function () {
  const models = { ...ghostOAuthProviderSchema, ...ghostJwtSchema };

  for (const [model, { modelName, fields }] of Object.entries(models)) {
    it(`maps every ${model} field onto a column of ${modelName}`, function () {
      const table = tables[modelName];
      assert.ok(table, `${modelName} is in schema.ts`);

      const missing = Object.entries(fields)
        .filter(([, column]) => !(column in table))
        .map(([field, column]) => `${field} -> ${column}`);
      assert.deepEqual(missing, []);
    });
  }
});
