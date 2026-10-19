const { createAddColumnMigration } = require('../../utils');

// Existing rows keep a null `created_at` because we don't know when they were
// added. That's fine: "label added" automations only look at new rows.
module.exports = createAddColumnMigration('members_labels', 'created_at', {
  type: 'dateTime',
  nullable: true,
});
