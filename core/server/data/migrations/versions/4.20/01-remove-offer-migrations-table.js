const utils = require('../../utils');

const migration = utils.addTable('offer_redemptions', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    offer_id: {type: 'string', maxlength: 24, nullable: false, references: 'offers.id', cascadeDelete: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    subscription_id: {type: 'string', maxlength: 24, nullable: false, references: 'members_stripe_customers_subscriptions.id', cascadeDelete: true}
});

// This reverses an "addTable" migration so that we
// drop the table going forwards and re-add it going back
const up = migration.down;
const down = migration.up;

migration.up = up;
migration.down = down;

module.exports = migration;

