const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('email_batches', 'member_segment', {
    type: 'text',
    maxlength: 2000,
    nullable: true
});
