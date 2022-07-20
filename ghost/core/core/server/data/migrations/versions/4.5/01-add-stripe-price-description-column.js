const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('stripe_prices', 'description', {
    type: 'string',
    maxlength: 191,
    nullable: true
});
