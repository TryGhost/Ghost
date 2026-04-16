const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('gifts', 'reminder_sent_at', {
    type: 'dateTime',
    nullable: true
});
