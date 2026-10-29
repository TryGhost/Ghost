const { createAddColumnMigration } = require('../../utils');

// Null for every field that already exists: only a list field is set up with anything beyond its
// name, and no field can be a list before this.
module.exports = createAddColumnMigration('members_metafields', 'settings', {
  type: 'text',
  maxlength: 16777215,
  fieldtype: 'medium',
  nullable: true,
});
