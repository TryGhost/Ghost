const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'email_open_rate', {
    type: 'integer',
    unsigned: true,
    nullable: true,
    index: true
});
