const commands = require('../../../schema').commands;

module.exports.up = commands.createColumnMigration({
    table: 'posts',
    column: 'send_email_when_published',
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding'
});

module.exports.down = commands.createColumnMigration({
    table: 'posts',
    column: 'send_email_when_published',
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Removing'
});

module.exports.config = {
    transaction: true
};
