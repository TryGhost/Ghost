const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('gift_deliveries', 'outcome_at_ms', {
    type: 'integer',
    nullable: false,
    unsigned: true,
    defaultTo: 0
});
