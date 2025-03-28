const {createAddColumnMigration, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    createAddColumnMigration('products', 'monthly_price', {
        type: 'integer',
        unsigned: true,
        nullable: true
    }),
    createAddColumnMigration('products', 'yearly_price', {
        type: 'integer',
        unsigned: true,
        nullable: true
    }),
    createAddColumnMigration('products', 'currency', {
        type: 'string',
        maxlength: 50,
        nullable: true
    })
);
