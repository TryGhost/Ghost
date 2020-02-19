const commands = require('../../../schema').commands;

const table = 'members';
const column = 'geolocation';

module.exports.up = commands.createColumnMigration({
    table,
    column,
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding'
});

module.exports.down = commands.createColumnMigration({
    table,
    column,
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Removing'
});

module.exports.config = {
    transaction: true
};
