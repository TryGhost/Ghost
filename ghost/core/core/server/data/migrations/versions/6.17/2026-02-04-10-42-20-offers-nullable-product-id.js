const {createSetNullableMigration} = require('../../utils');

module.exports = createSetNullableMigration('offers', 'product_id', {disableForeignKeyChecks: true});
