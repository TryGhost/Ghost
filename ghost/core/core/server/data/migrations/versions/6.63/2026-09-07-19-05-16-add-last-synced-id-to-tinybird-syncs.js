const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('tinybird_syncs', 'last_synced_id', {
  type: 'string',
  maxlength: 24,
  nullable: true,
});
