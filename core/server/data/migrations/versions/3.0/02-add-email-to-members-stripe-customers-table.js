const commands = require('../../../schema').commands;

module.exports = {

    up: commands.createColumnMigration({
        table: 'members_stripe_customers',
        column: 'email',
        dbIsInCorrectState(hasColumn) {
            return hasColumn === true;
        },
        operation: commands.addColumn,
        operationVerb: 'Adding'
    }),

    down: commands.createColumnMigration({
        table: 'members_stripe_customers',
        column: 'email',
        dbIsInCorrectState(hasColumn) {
            return hasColumn === false;
        },
        operation: commands.dropColumn,
        operationVerb: 'Dropping'
    }),

    config: {
        transaction: true
    }
};
