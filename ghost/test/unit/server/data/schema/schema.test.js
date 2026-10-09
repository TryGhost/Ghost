const assert = require('node:assert/strict');
const { assertExists } = require('../../../../utils/assertions');
const _ = require('lodash');

const schema = require('../../../../../core/server/data/schema/schema');
const { foreignKeysOf } = require('../../../../../core/server/data/schema/lib/foreign-keys');

const VALID_KEYS = {
  bigInteger: ['nullable'],
  binary: ['maxlength', 'nullable', 'index'],
  boolean: ['nullable', 'defaultTo'],
  dateTime: ['nullable', 'index'],
  integer: ['nullable', 'unsigned', 'defaultTo', 'index'],
  string: [
    'maxlength',
    'nullable',
    'primary',
    'unique',
    'validations',
    'defaultTo',
    'references',
    'constraintName',
    'cascadeDelete',
    'restrictDelete',
    'setNullDelete',
    'index',
  ],
  text: ['fieldtype', 'maxlength', 'nullable', 'validations'],
};

describe('schema validations', function () {
  it('matches the required format', function () {
    assert(_.isPlainObject(schema), 'Top-level export should be an object');

    _.each(schema, function (table, tableName) {
      assert(_.isPlainObject(table), 'Table should be an object');

      _.each(table, function (column, columnName) {
        if (
          ['@@INDEXES@@', '@@UNIQUE_CONSTRAINTS@@', '@@PRIMARY_KEY@@', '@@FOREIGN_KEYS@@'].includes(
            columnName,
          )
        ) {
          return;
        }

        assert(_.isPlainObject(column), 'Column should be an object');

        assertExists(column.type, `${tableName}.${columnName}.type should exist`);

        assert(Object.keys(VALID_KEYS).includes(column.type));
        assert.deepEqual(
          _.difference(Object.keys(column), [...VALID_KEYS[column.type], 'type']),
          [],
        );

        if ('index' in column) {
          assert(
            typeof column.index === 'boolean',
            'Column index option, if present, should be valid',
          );
        }
      });
    });
  });

  // MySQL rejects an identifier over 64 characters, and knex derives index and
  // constraint names from the table plus every column in them, so a wide index on a
  // long table name overruns it. SQLite has no such limit, so a migration that trips
  // this passes locally and fails on a production upgrade. Checked here, against the
  // declared schema, rather than waiting to find out.
  it('derives index and constraint names that MySQL will accept', function () {
    const MAX_IDENTIFIER = 64;
    // How knex builds a name when it is not given one.
    const derived = (tableName, columns, type) =>
      `${tableName}_${[].concat(columns).join('_')}_${type}`;

    const tooLong = [];
    const check = (name, what) => {
      if (name.length > MAX_IDENTIFIER) {
        tooLong.push(`${what}: ${name} (${name.length} chars)`);
      }
    };

    _.each(schema, function (table, tableName) {
      _.each(table['@@INDEXES@@'] ?? [], function (index) {
        const columns = _.isPlainObject(index) ? index.columns : index;
        const name =
          _.isPlainObject(index) && index.indexName
            ? index.indexName
            : derived(tableName, columns, 'index');
        check(name, `${tableName} index`);
      });

      _.each(table['@@UNIQUE_CONSTRAINTS@@'] ?? [], function (unique) {
        const columns = _.isPlainObject(unique) ? unique.columns : unique;
        const name =
          _.isPlainObject(unique) && unique.indexName
            ? unique.indexName
            : derived(tableName, columns, 'unique');
        check(name, `${tableName} unique constraint`);
      });

      for (const { constraintName } of foreignKeysOf(tableName, table)) {
        check(constraintName, `${tableName} foreign key`);
      }

      _.each(table, function (column, columnName) {
        if (columnName.startsWith('@@')) {
          return;
        }
        if (column.unique) {
          check(derived(tableName, columnName, 'unique'), `${tableName} unique column`);
        }
        if (column.index) {
          check(derived(tableName, columnName, 'index'), `${tableName} index column`);
        }
      });
    });

    assert.deepEqual(
      tooLong,
      [],
      `These names exceed MySQL's ${MAX_IDENTIFIER}-character limit. Give the index an explicit, shorter \`indexName\`.`,
    );
  });

  // MySQL needs an index that starts with the referenced columns, in the same order, and
  // SQLite a primary key or unique constraint over exactly them: without one, SQLite still
  // creates the table and then fails every write the key checks. MySQL also refuses a key
  // between columns of different types, or one that sets a column that cannot be null to null.
  it('points every foreign key at a unique key of the same types', function () {
    _.each(schema, function (table, tableName) {
      for (const { columns, references, onDelete } of foreignKeysOf(tableName, table)) {
        const where = `${tableName} (${columns.join(', ')}) to ${references.table}`;
        const parent = schema[references.table];
        assertExists(parent, `${where}: no such table`);
        assert.equal(references.columns.length, columns.length, where);

        const columnsWhere = (holds) =>
          Object.keys(parent).filter((column) => !column.startsWith('@@') && holds(parent[column]));
        const uniqueKeys = [
          parent['@@PRIMARY_KEY@@'] ?? columnsWhere((column) => column.primary),
          ...columnsWhere((column) => column.unique).map((column) => [column]),
          ...(parent['@@UNIQUE_CONSTRAINTS@@'] ?? []).map((unique) =>
            _.isPlainObject(unique) ? unique.columns : unique,
          ),
        ];
        assert(
          uniqueKeys.some((unique) => _.isEqual(unique, references.columns)),
          `${where}: (${references.columns.join(', ')}) is not a primary key or unique constraint there, in that order`,
        );

        columns.forEach((column, i) => {
          const referenced = references.columns[i];
          assertExists(table[column], `${where}: no column ${column}`);
          assertExists(parent[referenced], `${where}: no column ${referenced} there`);
          assert.equal(table[column].type, parent[referenced].type, `${where}: ${column} type`);
          if (onDelete === 'SET NULL') {
            assert.equal(table[column].nullable, true, `${where}: ${column} cannot be null`);
          }
        });
      }
    });
  });

  it('has correct isIn validation structure', async function () {
    const tablesOnlyValidation = _.cloneDeep(schema);

    _.each(tablesOnlyValidation, function (table) {
      _.each(table, function (column) {
        const columnIsInValidation = _.get(column, 'validations.isIn');
        // Check column's isIn validation is in correct format
        if (columnIsInValidation) {
          assert(Array.isArray(columnIsInValidation));
          assert.equal(columnIsInValidation.length, 1);
          assert(Array.isArray(columnIsInValidation[0]));
        }
      });
    });
  });
});
