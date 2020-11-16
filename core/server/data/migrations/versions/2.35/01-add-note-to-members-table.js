const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'note', {
    type: 'string',
    maxlength: 2000,
    nullable: true
});
