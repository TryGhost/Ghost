const {createColumnMigration, addColumn, dropColumn} = require('../../../schema/commands');

module.exports = {
    up: createColumnMigration({
        table: 'emails',
        column: 'recipient_filter',
        dbIsInCorrectState: hasColumn => !!hasColumn,
        operation: addColumn,
        operationVerb: 'Adding',
        columnDefinition: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'paid',
            validations: {isIn: [['all', 'free', 'paid']]}
        }
    }),
    down: createColumnMigration({
        table: 'emails',
        column: 'recipient_filter',
        dbIsInCorrectState: hasColumn => !hasColumn,
        operation: dropColumn,
        operationVerb: 'Removing'
    })
};
