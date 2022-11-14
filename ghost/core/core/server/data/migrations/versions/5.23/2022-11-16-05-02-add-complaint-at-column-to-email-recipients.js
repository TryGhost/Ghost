const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('email_recipients', 'complaint_at', {
    type: 'dateTime',
    nullable: true
});
