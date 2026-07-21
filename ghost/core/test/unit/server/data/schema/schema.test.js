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
        'restrictDelete',
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
        assert(_.isPlainObject(schema), 'Top-level export should be an object');

        _.each(schema, function (table, tableName) {
            assert(_.isPlainObject(table), 'Table should be an object');

            _.each(table, function (column, columnName) {
                if (['@@INDEXES@@', '@@UNIQUE_CONSTRAINTS@@', '@@PRIMARY_KEY@@'].includes(columnName)) {
                    return;
                }

                assert(_.isPlainObject(column), 'Column should be an object');

                assertExists(column.type, `${tableName}.${columnName}.type should exist`);

                assert(Object.keys(VALID_KEYS).includes(column.type));
                assert.deepEqual(_.difference(Object.keys(column), [...VALID_KEYS[column.type], 'type']), []);

                if ('index' in column) {
                    assert(
                        typeof column.index === 'boolean',
                        'Column index option, if present, should be valid'
                    );
                };
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
