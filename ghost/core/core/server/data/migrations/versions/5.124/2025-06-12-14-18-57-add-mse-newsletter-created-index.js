const {createAddIndexMigration} = require('../../utils');

module.exports = createAddIndexMigration('members_subscribe_events', ['newsletter_id', 'created_at']);