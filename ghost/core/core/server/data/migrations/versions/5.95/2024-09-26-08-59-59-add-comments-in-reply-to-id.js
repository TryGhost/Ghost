const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('comments', 'in_reply_to_id', {
    type: 'string',
    maxlength: 24,
    nullable: true,
    unique: false,
    references: 'comments.id',
    setNullDelete: true
});
