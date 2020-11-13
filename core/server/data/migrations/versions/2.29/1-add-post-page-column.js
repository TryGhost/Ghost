const {createNonTransactionalMigration} = require('../../utils');
const commands = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    commands.createColumnMigration({
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
    }),
    () => Promise.resolve()
);
