// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('emails', 'latest_event_timestamp', {
    type: 'dateTime', nullable: true
});
