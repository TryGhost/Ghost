// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const {addTable} = require('../../utils');

module.exports = addTable('donation_payment_events', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    name: {type: 'string', maxlength: 191, nullable: true},
    email: {type: 'string', maxlength: 191, nullable: false, unique: false},
    member_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'members.id', setNullDelete: true},
    amount: {type: 'integer', nullable: false},
    currency: {type: 'string', maxlength: 50, nullable: false},
    attribution_id: {type: 'string', maxlength: 24, nullable: true},
    attribution_type: {type: 'string', maxlength: 50, nullable: true},
    attribution_url: {type: 'string', maxlength: 2000, nullable: true},
    referrer_source: {type: 'string', maxlength: 191, nullable: true},
    referrer_medium: {type: 'string', maxlength: 191, nullable: true},
    referrer_url: {type: 'string', maxlength: 2000, nullable: true},
    created_at: {type: 'dateTime', nullable: false}
});
