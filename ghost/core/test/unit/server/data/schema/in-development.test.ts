import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import schema from '../../../../../core/server/data/schema/schema';

// require, not import: config-utils and in-development must resolve to the same
// CommonJS config instance, so values set here are the ones the module reads
const configUtils = require('../../../../utils/config-utils');
const inDevelopment: typeof import('../../../../../core/server/data/schema/in-development') = require('../../../../../core/server/data/schema/in-development');

type ColumnSpec = { references?: string };

describe('In-development schema tables', function () {
  afterEach(async function () {
    await configUtils.restore();
  });

  it('only lists tables defined in schema.js', function () {
    for (const tableName of inDevelopment.IN_DEVELOPMENT_TABLES) {
      assert(
        Object.hasOwn(schema, tableName),
        `In-development table ${tableName} is not defined in schema.js`,
      );
    }
  });

  it('are never referenced by finalised tables', function () {
    // A finalised table exists in every database, so a foreign key to a table
    // that is only created in development would fail to create in production
    for (const [tableName, table] of Object.entries<Record<string, ColumnSpec>>(schema)) {
      if (inDevelopment.isInDevelopmentTable(tableName)) {
        continue;
      }

      for (const [columnName, column] of Object.entries(table)) {
        if (!column.references) {
          continue;
        }

        const referencedTable = column.references.split('.')[0];
        assert(
          !inDevelopment.isInDevelopmentTable(referencedTable),
          `${tableName}.${columnName} references in-development table ${referencedTable}`,
        );
      }
    }
  });

  describe('shouldCreateInDevelopmentTables', function () {
    it('is enabled in development and testing when configured', function () {
      configUtils.set('createInDevelopmentTables', true);

      for (const env of ['development', 'testing', 'testing-mysql']) {
        configUtils.set('env', env);
        assert.equal(inDevelopment.shouldCreateInDevelopmentTables(), true, env);
      }
    });

    it('is disabled when not configured', function () {
      configUtils.set('env', 'development');
      configUtils.set('createInDevelopmentTables', false);

      assert.equal(inDevelopment.shouldCreateInDevelopmentTables(), false);
    });

    it('ignores the config outside development and testing', function () {
      configUtils.set('env', 'production');
      configUtils.set('createInDevelopmentTables', true);

      assert.equal(inDevelopment.shouldCreateInDevelopmentTables(), false);
    });
  });

  describe('getTablesToCreate', function () {
    let originalTables: string[];

    beforeEach(function () {
      originalTables = [...inDevelopment.IN_DEVELOPMENT_TABLES];
      inDevelopment.IN_DEVELOPMENT_TABLES.splice(0, Infinity, 'posts_meta');
      configUtils.set('env', 'development');
    });

    afterEach(function () {
      inDevelopment.IN_DEVELOPMENT_TABLES.splice(0, Infinity, ...originalTables);
    });

    it('includes in-development tables when enabled', function () {
      configUtils.set('createInDevelopmentTables', true);

      assert.deepEqual(inDevelopment.getTablesToCreate(), Object.keys(schema));
    });

    it('excludes in-development tables when disabled', function () {
      configUtils.set('createInDevelopmentTables', false);

      const tables = inDevelopment.getTablesToCreate();
      assert(!tables.includes('posts_meta'));
      assert.equal(tables.length, Object.keys(schema).length - 1);
    });
  });
});
