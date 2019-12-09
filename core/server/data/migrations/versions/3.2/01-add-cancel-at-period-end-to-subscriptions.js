const commands = require('../../../schema').commands;

module.exports.up = commands.createColumnMigration({
    table: 'members_stripe_customers_subscriptions',
    column: 'cancel_at_period_end',
    dbIsInCorrectState(columnExists) {
        return columnExists === true;
    },
    operation: commands.addColumn,
    operationVerb: 'Adding'
});

module.exports.down = commands.createColumnMigration({
    table: 'members_stripe_customers_subscriptions',
    column: 'cancel_at_period_end',
    dbIsInCorrectState(columnExists) {
        return columnExists === false;
    },
    operation: commands.dropColumn,
    operationVerb: 'Removing'
});

module.exports.config = {
    transaction: true
};
