const {createColumnMigration, addColumn, dropColumn} = require('../../../schema/commands');

module.exports = {
    up: createColumnMigration({
        table: 'posts',
        column: 'email_recipient_filter',
        dbIsInCorrectState: hasColumn => !!hasColumn,
        operation: addColumn,
        operationVerb: 'Adding',
        columnDefinition: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'none',
            validations: {isIn: [['none', 'all', 'free', 'paid']]}
        }
    }),
    down: createColumnMigration({
        table: 'posts',
        column: 'email_recipient_filter',
        dbIsInCorrectState: hasColumn => !hasColumn,
        operation: dropColumn,
        operationVerb: 'Removing'
    })
};
