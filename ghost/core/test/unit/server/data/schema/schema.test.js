const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const _ = require('lodash');

const schema = require('../../../../../core/server/data/schema/schema');

const VALID_KEYS = {
    bigInteger: [
        'nullable'
    ],
    boolean: [
        'nullable',
        'defaultTo'
    ],
    dateTime: [
        'nullable',
        'index'
    ],
    integer: [
        'nullable',
        'unsigned',
        'defaultTo',
        'index'
    ],
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
        'setNullDelete',
        'index'
    ],
    text: [
        'fieldtype',
        'maxlength',
        'nullable',
        'validations'
    ]
};

describe('schema validations', function () {
    it('matches the required format', function () {
        // The top-level export should be an object of table names to definitions
        assert(_.isPlainObject(schema));

        // Each table should be an object, and each column should be an object
        _.each(schema, function (table, tableName) {
            assert(_.isPlainObject(table));

            _.each(table, function (column, columnName) {
                if (['@@INDEXES@@', '@@UNIQUE_CONSTRAINTS@@'].includes(columnName)) {
                    return;
                }

                // Ensure the column is an object
                assert(_.isPlainObject(column));

                // Ensure the `type` key exists on a column
                assertExists(column.type, `${tableName}.${columnName}.type should exist`);

                // Ensure the column type is one of the ones we allow
                assert(Object.keys(VALID_KEYS).includes(column.type));

                assert.deepEqual(_.difference(Object.keys(column), [...VALID_KEYS[column.type], 'type']), []);
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
