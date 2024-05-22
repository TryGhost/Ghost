const {addTable} = require('../../utils');

module.exports = addTable('members_payment_events', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    amount: {type: 'integer', nullable: false},
    currency: {type: 'string', maxlength: 191, nullable: false},
    source: {type: 'string', maxlength: 50, nullable: false},
    created_at: {type: 'dateTime', nullable: false}
});
