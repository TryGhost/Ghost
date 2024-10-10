const {createAddIndexMigration} = require('../../utils');

module.exports = createAddIndexMigration('members_created_events', ['attribution_id']);
