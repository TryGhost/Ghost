const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'atproto_session', {
    type: 'text',
    maxlength: 65535,
    nullable: true
});
