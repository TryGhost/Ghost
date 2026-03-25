const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('member_gifts', 'credited_amount', {
    type: 'integer',
    nullable: true
});
