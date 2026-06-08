const {createAddIndexMigration} = require('../../utils');

module.exports = createAddIndexMigration('members_subscription_created_events', ['attribution_id']);
