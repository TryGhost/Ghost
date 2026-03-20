const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'atproto_scope', {
    type: 'string',
    maxlength: 100,
    nullable: true
});
