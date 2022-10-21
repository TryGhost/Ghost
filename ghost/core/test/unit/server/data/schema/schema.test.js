const should = require('should');
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
        should(schema).be.Object();

        // Each table should be an object, and each column should be an object
        _.each(schema, function (table, tableName) {
            should(table).be.Object();

            _.each(table, function (column, columnName) {
                if (['@@INDEXES@@', '@@UNIQUE_CONSTRAINTS@@'].includes(columnName)) {
                    return;
                }

                // Ensure the column is an object
                should(column).be.Object();

                // Ensure the `type` key exists on a column
                should.exist(column.type, `${tableName}.${columnName}.type should exist`);

                // Ensure the column type is one of the ones we allow
                should(column.type).be.equalOneOf(Object.keys(VALID_KEYS));

                should(_.difference(Object.keys(column), [...VALID_KEYS[column.type], 'type'])).be.Array().with.length(0);
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
                    should(columnIsInValidation).be.Array().with.length(1);
                    should(columnIsInValidation[0]).be.Array();
                }
            });
        });
    });
});
