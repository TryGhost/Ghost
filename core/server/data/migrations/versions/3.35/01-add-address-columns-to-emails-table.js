const commands = require('../../../schema').commands;

const newColumns = [{
    column: 'from',
    columnDefinition: {
        type: 'string',
        maxlength: 191,
        nullable: true
    }
}, {
    column: 'reply_to',
    columnDefinition: {
        type: 'string',
        maxlength: 191,
        nullable: true
    }
}];

module.exports = {
    config: {
        transaction: true
    },

    up: commands.createColumnMigration(...newColumns.map((column) => {
        return Object.assign({}, column, {
            table: 'emails',
            dbIsInCorrectState: hasColumn => hasColumn === true,
            operation: commands.addColumn,
            operationVerb: 'Adding'
        });
    })),

    down: commands.createColumnMigration(...newColumns.map((column) => {
        return Object.assign({}, column, {
            table: 'emails',
            dbIsInCorrectState: hasColumn => hasColumn === false,
            operation: commands.dropColumn,
            operationVerb: 'Removing'
        });
    }))
};
