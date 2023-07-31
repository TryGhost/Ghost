const {createSetNullableMigration} = require('../../utils');

// We need to disable foreign key checks because if MySQL is missing the STRICT_TRANS_TABLES mode, we cannot revert the migration
module.exports = createSetNullableMigration('stripe_products', 'product_id', {disableForeignKeyChecks: true});
