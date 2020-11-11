const {createTransactionalMigration} = require('../../utils');
const commands = require('../../../schema/commands');

module.exports = createTransactionalMigration(
    commands.createColumnMigration({
        table: 'posts',
        column: 'type',
        dbIsInCorrectState(columnExists) {
            return columnExists === false;
        },
        operation: commands.dropColumn,
        operationVerb: 'Removing'
    }),
    () => Promise.resolve()
);
