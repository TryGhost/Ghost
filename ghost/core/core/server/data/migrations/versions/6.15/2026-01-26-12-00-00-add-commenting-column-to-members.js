const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'commenting', {
    type: 'text',
    maxlength: 65535,
    nullable: true
});
