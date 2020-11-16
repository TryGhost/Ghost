const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('emails', 'error_data', {
    type: 'text',
    maxlength: 1000000000,
    fieldtype: 'long',
    nullable: true
});
