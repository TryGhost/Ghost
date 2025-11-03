const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('emails', 'csd_email_count', {
    type: 'integer',
    nullable: true,
    unsigned: true
});
