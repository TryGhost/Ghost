const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('email_batches', 'fallback_domain', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
