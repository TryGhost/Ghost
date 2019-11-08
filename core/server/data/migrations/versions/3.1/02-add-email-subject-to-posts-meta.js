const commands = require('../../../schema').commands;

module.exports.up = commands.createColumnMigration({
    table: 'posts_meta',
    column: 'email_subject',
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding'
});

module.exports.down = commands.createColumnMigration({
    table: 'posts_meta',
    column: 'email_subject',
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Removing'
});

module.exports.config = {
    transaction: true
};
