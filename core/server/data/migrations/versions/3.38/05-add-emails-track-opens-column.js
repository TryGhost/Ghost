const {createColumnMigration, addColumn, dropColumn} = require('../../../schema').commands;

module.exports = {
    up: createColumnMigration({
        table: 'emails',
        column: 'track_opens',
        dbIsInCorrectState: hasColumn => hasColumn === true,
        operation: addColumn,
        operationVerb: 'Adding',
        columnDefinition: {
            type: 'bool',
            nullable: false,
            defaultTo: false
        }
    }),

    down: createColumnMigration({
        table: 'emails',
        column: 'track_opens',
        dbIsInCorrectState: hasColumn => hasColumn === false,
        operation: dropColumn,
        operationVerb: 'Removing'
    })
};
