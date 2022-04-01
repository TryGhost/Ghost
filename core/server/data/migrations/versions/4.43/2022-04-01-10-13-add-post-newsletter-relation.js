const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'newsletter_id', {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'newsletters.id'
});
