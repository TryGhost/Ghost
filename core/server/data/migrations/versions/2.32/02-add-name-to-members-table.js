const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'name', {
    type: 'string',
    maxlength: 191,
    nullable: true
});
