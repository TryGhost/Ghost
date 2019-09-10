const commands = require('../../../schema').commands;

module.exports = {

    up: commands.createColumnMigration({
        table: 'members',
        column: 'password',
        dbIsInCorrectState(hasColumn) {
            return hasColumn === false;
        },
        operation: commands.dropColumn,
        operationVerb: 'Dropping'
    }, {
        table: 'members',
        column: 'name',
        dbIsInCorrectState(hasColumn) {
            return hasColumn === false;
        },
        operation: commands.dropColumn,
        operationVerb: 'Dropping'
    }),

    down: commands.createColumnMigration({
        table: 'members',
        column: 'password',
        dbIsInCorrectState(hasColumn) {
            return hasColumn === true;
        },
        operation: commands.addColumn,
        operationVerb: 'Adding',
        columnDefinition: {
            type: 'string',
            maxlength: 60,
            nullable: true
        }
    }, {
        table: 'members',
        column: 'name',
        dbIsInCorrectState(hasColumn) {
            return hasColumn === true;
        },
        operation: commands.addColumn,
        operationVerb: 'Adding',
        columnDefinition: {
            type: 'string',
            maxlength: 191,
            nullable: false,
            defaultTo: ''
        }
    }),

    config: {
        transaction: true
    }
};
