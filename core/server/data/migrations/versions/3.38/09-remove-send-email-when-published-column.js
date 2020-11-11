const {createColumnMigration, addColumn, dropColumn} = require('../../../schema/commands');

module.exports = {
    up: createColumnMigration({
        table: 'posts',
        column: 'send_email_when_published',
        dbIsInCorrectState(columnExists) {
            return columnExists === false;
        },
        operation: dropColumn,
        operationVerb: 'Removing'
    }),

    down: createColumnMigration({
        table: 'posts',
        column: 'send_email_when_published',
        dbIsInCorrectState(columnExists) {
            return columnExists === true;
        },
        operation: addColumn,
        operationVerb: 'Adding',
        columnDefinition: {
            type: 'bool',
            nullable: true,
            defaultTo: false
        }
    })
};
