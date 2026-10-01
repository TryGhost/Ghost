const assert = require('node:assert/strict');
const { assertExists } = require('../../../../utils/assertions');
const _ = require('lodash');

const schema = require('../../../../../core/server/data/schema/schema');

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

      _.each(table['@@FOREIGN_KEYS@@'] ?? [], function (foreignKey) {
        check(
          foreignKey.constraintName ?? derived(tableName, foreignKey.columns, 'foreign'),
          `${tableName} foreign key`,
        );
      });

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
        if (column.references) {
          check(
            column.constraintName ?? derived(tableName, columnName, 'foreign'),
            `${tableName} foreign key`,
          );
        }
      });
    });

    assert.deepEqual(
      tooLong,
      [],
      `These names exceed MySQL's ${MAX_IDENTIFIER}-character limit. Give the index an explicit, shorter \`indexName\`.`,
    );
  });

  // A foreign key over several columns is declared on the table rather than on a column, so
  // the column format above checks nothing about it.
  it('points every foreign key over several columns at a unique key', function () {
    const VALID_FOREIGN_KEY_KEYS = [
      'columns',
      'references',
      'constraintName',
      'cascadeDelete',
      'restrictDelete',
      'setNullDelete',
    ];

    _.each(schema, function (table, tableName) {
      _.each(table['@@FOREIGN_KEYS@@'] ?? [], function (foreignKey) {
        const where = `${tableName} foreign key to ${foreignKey.references?.table}`;
        assert.deepEqual(_.difference(Object.keys(foreignKey), VALID_FOREIGN_KEY_KEYS), [], where);

        const parent = schema[foreignKey.references.table];
        assertExists(parent, `${where}: no such table`);
        assert.equal(foreignKey.references.columns.length, foreignKey.columns.length, where);
        for (const column of foreignKey.columns) {
          assertExists(table[column], `${where}: no column ${column}`);
        }

        // MySQL would settle for any index that starts with these columns. SQLite needs a
        // primary key or unique constraint over exactly them, and without one fails every
        // write the foreign key checks, so the stricter rule is the one held here.
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
          uniqueKeys.some((unique) =>
            _.isEqual([...unique].sort(), [...foreignKey.references.columns].sort()),
          ),
          `${where}: (${foreignKey.references.columns.join(', ')}) is not a primary key or unique constraint there`,
        );
      });
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
