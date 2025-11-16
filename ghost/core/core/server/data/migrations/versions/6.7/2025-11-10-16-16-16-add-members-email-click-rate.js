const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'email_click_rate', {
    type: 'integer',
    nullable: true,
    unsigned: true
});
