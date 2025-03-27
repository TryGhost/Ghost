const {addTable} = require('../../utils');

module.exports = addTable('members_paid_subscription_events', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    from_plan: {type: 'string', maxlength: 255, nullable: true},
    to_plan: {type: 'string', maxlength: 255, nullable: true},
    currency: {type: 'string', maxlength: 191, nullable: false},
    source: {type: 'string', maxlength: 50, nullable: false},
    mrr_delta: {type: 'integer', nullable: false},
    created_at: {type: 'dateTime', nullable: false}
});
