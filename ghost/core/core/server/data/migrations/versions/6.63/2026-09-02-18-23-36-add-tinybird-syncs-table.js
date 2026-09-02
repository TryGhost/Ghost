const { addTable } = require('../../utils');

module.exports = addTable('tinybird_syncs', {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  table_name: { type: 'string', maxlength: 191, nullable: false, unique: true },
  last_synced_updated_at: { type: 'dateTime', nullable: false },
  created_at: { type: 'dateTime', nullable: false },
  updated_at: { type: 'dateTime', nullable: true },
});
