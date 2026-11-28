import assert from 'node:assert/strict';
import { oauthProvider } from '@better-auth/oauth-provider';
import { jwt } from 'better-auth/plugins';
import {
  ghostJwtSchema,
  ghostOAuthProviderSchema,
} from '../../../../../core/server/auth/better-auth/ghost-models';
import schema from '../../../../../core/server/data/schema/schema';

type Column = { nullable?: boolean; defaultTo?: unknown; defaultExpression?: unknown };
type DeclaredField = { required?: boolean };
type Mapping = { modelName: string; fields: Record<string, string> };

const tables = schema as unknown as Record<string, Record<string, Column>>;

// The plugins' own declarations, without Ghost's mappings merged in
const declared = {
  ...oauthProvider({ loginPage: '/', consentPage: '/' }).schema,
  ...jwt().schema,
} as Record<string, { fields: Record<string, DeclaredField> }>;

const mappings: Record<string, Mapping> = { ...ghostOAuthProviderSchema, ...ghostJwtSchema };

describe('ghost-models', function () {
  it('maps every model the provider and jwt plugins declare', function () {
    assert.deepEqual(Object.keys(mappings).toSorted(), Object.keys(declared).toSorted());
  });

  for (const [model, { fields }] of Object.entries(declared)) {
    describe(model, function () {
      const mapping = mappings[model];
      const table = mapping && tables[mapping.modelName];
      const columnOf = (field: string) => mapping?.fields[field] ?? field;

      it('has a table in schema.ts', function () {
        assert.ok(table, `${mapping?.modelName} is in schema.ts`);
      });

      it('maps every declared field onto a column', function () {
        const missing = Object.keys(fields)
          .filter((field) => !table || !(columnOf(field) in table))
          .map((field) => `${field} -> ${columnOf(field)}`);
        assert.deepEqual(missing, []);
      });

      it('maps no field the plugin does not declare', function () {
        const extra = Object.keys(mapping?.fields ?? {}).filter((field) => !(field in fields));
        assert.deepEqual(extra, []);
      });

      it('makes a column NOT NULL exactly where the plugin requires its field', function () {
        const mismatched = Object.entries(fields).flatMap(([field, { required }]) => {
          const column = table?.[columnOf(field)];
          if (!column) {
            return [];
          }
          const isRequired = required !== false;
          const isNullable = column.nullable === true;
          // A NOT NULL column for an optional field holds only with a default to fill it
          const hasDefault = 'defaultTo' in column || 'defaultExpression' in column;
          if (isRequired ? isNullable : !isNullable && !hasDefault) {
            return [`${field} (${isRequired ? 'required' : 'optional'}) -> ${columnOf(field)}`];
          }
          return [];
        });
        assert.deepEqual(mismatched, []);
      });
    });
  }
});
