const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('member_gifts', 'credited_at', {
    type: 'dateTime',
    nullable: true
});
