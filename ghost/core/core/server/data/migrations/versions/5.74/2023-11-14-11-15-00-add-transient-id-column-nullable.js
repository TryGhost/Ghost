const {createAddColumnMigration} = require('../../utils');

// First make a nullable column
module.exports = createAddColumnMigration('members', 'transient_id', {
    type: 'string',
    maxlength: 191,
    nullable: true,
    unique: true
});
