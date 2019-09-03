const common = require('../../../../lib/common');
const commands = require('../../../schema').commands;

const createLog = type => msg => common.logging[type](msg);

function createColumnMigrations(migrations) {
    return function columnMigrations({transacting}) {
        return Promise.each(migrations, function ({table, column, dbIsInCorrectState, operation, operationVerb, columnDefinition}) {
            return transacting.schema.hasColumn(table, column)
                .then(dbIsInCorrectState)
                .then((isInCorrectState) => {
                    const log = createLog(isInCorrectState ? 'warn' : 'info');

                    log(`${operationVerb} ${table}.${column}`);

                    if (!isInCorrectState) {
                        return operation(table, column, transacting, columnDefinition);
                    }
                });
        });
    };
}

module.exports.up = createColumnMigrations([
    {
        table: 'users',
        column: 'ghost_auth_access_token',
        dbIsInCorrectState(columnExists) {
            return columnExists === false;
        },
        operation: commands.dropColumn,
        operationVerb: 'Removing'
    },
    {
        table: 'users',
        column: 'ghost_auth_id',
        dbIsInCorrectState(columnExists) {
            return columnExists === false;
        },
        operation: commands.dropColumn,
        operationVerb: 'Removing'
    }
]);

module.exports.down = createColumnMigrations([
    {
        table: 'users',
        column: 'ghost_auth_access_token',
        dbIsInCorrectState(columnExists) {
            return columnExists === true;
        },
        operation: commands.addColumn,
        operationVerb: 'Adding',
        columnDefinition: {
            type: 'string',
            nullable: true,
            maxlength: 32
        }
    },
    {
        table: 'users',
        column: 'ghost_auth_id',
        dbIsInCorrectState(columnExists) {
            return columnExists === true;
        },
        operation: commands.addColumn,
        operationVerb: 'Adding',
        columnDefinition: {
            type: 'string',
            nullable: true,
            maxlength: 24
        }
    }
]);

module.exports.config = {
    transaction: true
};
