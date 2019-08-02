const common = require('../../../../lib/common');
const commands = require('../../../schema').commands;

const createLog = type => msg => common.logging[type](msg);

function createColumnMigration({table, column, dbIsInCorrectState, operation, operationVerb, columnDefinition}) {
    return function columnMigrations({transacting}) {
        return transacting.schema.hasColumn(table, column)
            .then(dbIsInCorrectState)
            .then((isInCorrectState) => {
                const log = createLog(isInCorrectState ? 'warn' : 'info');

                log(`${operationVerb} ${table}.${column}`);

                if (!isInCorrectState) {
                    return operation(table, column, transacting, columnDefinition);
                }
            });
    };
}

module.exports.up = createColumnMigration({
    table: 'posts',
    column: 'page',
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Removing'
});

module.exports.down = createColumnMigration({
    table: 'posts',
    column: 'page',
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding',
    columnDefinition: {
        type: 'bool',
        nullable: false,
        defaultTo: false
    }
});

module.exports.config = {
    transaction: true
};
