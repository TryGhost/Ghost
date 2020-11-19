const {addTable, combineNonTransactionalMigrations} = require('../../utils');

// table order is important because of foreign key constraints,
// email_recipients references email_batches so email_batches has to exist when creating
module.exports = combineNonTransactionalMigrations(
    addTable('email_batches'),
    addTable('email_recipients')
);
