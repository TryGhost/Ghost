const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('products', 'trial_days', {
    type: 'integer',
    unsigned: true,
    nullable: false,
    defaultTo: 0
});
