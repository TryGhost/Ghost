const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'aggregate_email_open_rate', {
    type: 'integer',
    unsigned: true,
    nullable: true
});
