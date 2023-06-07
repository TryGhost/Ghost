const {combineNonTransactionalMigrations,createAddColumnMigration} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('products', 'one_time_price_id', {
        type: 'string',
        maxlength: 24,
        nullable: true
    }),
    createAddColumnMigration('products', 'one_time_price', {
        type: 'integer',
        unsigned: true,
        nullable: true
    }),
);
