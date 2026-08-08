const {createSetNullableMigration} = require('../../utils');

module.exports = createSetNullableMigration('members_subscribe_events', 'newsletter_id', {disableForeignKeyChecks: true});
