const assert = require('node:assert/strict');
const configUtils = require('../../../../utils/config-utils');
const schema = require('../../../../../core/server/data/schema/schema');
const inDevelopment = require('../../../../../core/server/data/schema/in-development');

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
    for (const [tableName, table] of Object.entries(schema)) {
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

  describe('getTablesToCreate', function () {
    let originalTables;

    beforeEach(function () {
      originalTables = [...inDevelopment.IN_DEVELOPMENT_TABLES];
      inDevelopment.IN_DEVELOPMENT_TABLES.splice(0, Infinity, 'posts_meta');
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
