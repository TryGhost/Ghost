const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('emails', 'newsletter_id', {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'newsletters.id'
});
